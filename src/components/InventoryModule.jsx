import React, { useState, useEffect, useMemo } from 'react';
import { getRoleCategory } from '../utils/staffRoles';
import { 
  Package, 
  Plus, 
  Minus, 
  Search, 
  AlertTriangle, 
  Edit3,
  Loader2,
  TrendingDown,
  ChevronRight,
  Zap,
  Trash2,
  History,
  Tag, 
  Filter, 
  ShieldAlert,
  X,
  Camera,
  ShoppingBag,
  Coffee,
  Wrench,
  ShoppingCart,
  Scissors,
  Store,
  Croissant,
  GlassWater,
  Beer,
  CupSoda,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  TrendingUp
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonList, SkeletonGrid } from './Skeleton';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useModal } from '../context/ModalContext';
import { createPortal } from 'react-dom';
import PandaSelect from './PandaSelect';
import { normalizeForSearch } from '../utils/stringUtils';
import PandaCamera from './PandaCamera';
import AnimatedModal from './AnimatedModal';
import { formatProductName } from '../utils/stringUtils';
import FieldLabel from './FieldLabel';

const INVENTORY_TABS = [
  { id: 'cafe', label: 'Café', shortLabel: 'Café', inventoryType: 'cafe', defaultCategory: 'Bebidas', icon: Coffee },
  { id: 'retail', label: 'Productos para venta', shortLabel: 'Productos', inventoryType: 'barbershop', defaultCategory: 'Venta', icon: ShoppingBag },
  { id: 'tools', label: 'Herramientas y accesorios', shortLabel: 'Herramientas', inventoryType: 'tools', defaultCategory: 'Herramienta', icon: Wrench }
];

const belongsToInventory = (item, inventoryId) => {
  const type = item?.inventory_type || 'barbershop';
  const category = item?.category || '';

  if (inventoryId === 'cafe') return type === 'cafe';
  if (inventoryId === 'tools') {
    return type === 'tools'
      || (type === 'barbershop' && ['Herramienta', 'Accesorios', 'Uso Interno'].includes(category));
  }

  return type === 'barbershop'
    && !['Herramienta', 'Accesorios', 'Uso Interno'].includes(category);
};

const InventoryModule = ({ isMobile, currency, rates }) => {
  const { user } = useAuth();
  const { showToast } = useNotifs();
  const { confirm } = useDialog();
  const { pushModal, popModal } = useModal();
  const [inventory, setInventory] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeInventory, setActiveInventory] = useState('cafe');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [newItem, setNewItem] = useState({ 
    name: '', 
    stock: 0, 
    price: 0, 
    cost_price: 0,
    commission_pct: 10,
    category: 'Bebidas',
    image_url: '',
    owner_staff_id: null,
    cost_price_dirty: false,
    price_dirty: false,
    stock_dirty: false,
    commission_pct_dirty: false
  });
  const selectedInventory = INVENTORY_TABS.find(tab => tab.id === activeInventory) || INVENTORY_TABS[0];

  const handleCloseAddForm = () => {
    if (!showAddForm && !isFormExiting) return;
    setIsFormExiting(true);
    setTimeout(() => {
      setShowAddForm(false);
      setEditingItem(null);
      setIsFormExiting(false);
    }, 250);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [retailData, cafeData, toolsData, staffData] = await Promise.all([
        dataService.getInventory('barbershop'),
        dataService.getInventory('cafe'),
        dataService.getInventory('tools'),
        dataService.getStaff()
      ]);
      const mergedInventory = [...retailData, ...cafeData, ...toolsData]
        .filter((item, index, items) => items.findIndex(candidate => candidate.id === item.id) === index);
      setInventory(mergedInventory);
      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handeAdjustStock = async (id, currentStock, amount) => {
    try {
      const newStock = Math.max(0, currentStock + amount);
      await dataService.updateStock(id, newStock);
      
      // Log movement
      await dataService.logInventoryMovement({
        product_id: id,
        type: amount > 0 ? 'entry' : 'exit',
        amount: Math.abs(amount),
        reason: 'Ajuste Manual'
      });

      fetchInventory();
    } catch (error) {
      showToast('Error al ajustar stock', 'error');
    }
  };

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('panda_inventoryViewMode') || 'list');
  useEffect(() => {
    localStorage.setItem('panda_inventoryViewMode', viewMode);
  }, [viewMode]);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    if (showCamera || showHistoryModal || editingItem) {
      pushModal();
      return () => popModal();
    }
  }, [showCamera, showHistoryModal, editingItem, pushModal, popModal]);

  useEffect(() => {
    if (!showHistoryModal) {
      setHistorySearch('');
      setHistoryFilter('all');
    }
  }, [showHistoryModal]);

  const handleAddItem = async () => {
    if (!newItem.name || saving) return;
    try {
      setSaving(true);
      // Sanitize object: Only send database-columns
      const { cost_price_dirty, price_dirty, stock_dirty, commission_pct_dirty, ...cleanItem } = newItem;
      
      cleanItem.name = formatProductName(cleanItem.name);
      
      // Ensure empty strings are treated as 0
      const finalItem = {
        ...cleanItem,
        inventory_type: selectedInventory.inventoryType,
        price: Number(cleanItem.price) || 0,
        cost_price: Number(cleanItem.cost_price) || 0,
        stock: Number(cleanItem.stock) || 0,
        commission_pct: Number(cleanItem.commission_pct) || 0
      };

      const created = await dataService.addInventoryItem(finalItem);
      
      // Log initial movement if stock > 0
      if (finalItem.stock > 0 && created?.id) {
        await dataService.logInventoryMovement({
          product_id: created.id,
          type: 'entry',
          amount: finalItem.stock,
          reason: 'Carga Inicial'
        });
      }

      setShowAddForm(false);
      setNewItem({ name: '', stock: 0, price: 0, cost_price: 0, commission_pct: 10, category: selectedInventory.defaultCategory, image_url: '', owner_staff_id: null, cost_price_dirty: false, price_dirty: false, stock_dirty: false, commission_pct_dirty: false });
      fetchInventory();
      showToast('Producto agregado al almacén');
    } catch (error) {
      console.error(error);
      showToast('Error al agregar item de inventario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!await confirm(`¿Estás seguro de que quieres eliminar "${name}" del inventario?`)) return;
    try {
      await dataService.deleteInventoryItem(id);
      fetchInventory();
      showToast('Producto eliminado');
    } catch (error) {
      showToast('Error al eliminar producto', 'error');
    }
  };

  const visibleInventory = inventory.filter(item => belongsToInventory(item, activeInventory));
  const lowStockCount = visibleInventory.filter(item => item.stock <= 5 && item.category !== 'Accesorios').length;

  const filteredInventory = visibleInventory.filter(item => {
    const term = normalizeForSearch(searchTerm);
    const searchMatch = normalizeForSearch(item.name || '').includes(term);
    if (!searchMatch) return false;

    // Filter for barbers: They see everything EXCEPT other barbers' tools
    const isBarber = getRoleCategory(user?.role || '') === 'odontologo';
    if (isBarber) {
      // If it's a tool, it MUST be mine or have no owner
      if (item.category === 'Herramienta') {
        return String(item.owner_staff_id) === String(user.id);
      }
      // They also see general sales/internal items
    }
    return true;
  });

  const handleInventoryChange = (inventoryId) => {
    const nextInventory = INVENTORY_TABS.find(tab => tab.id === inventoryId);
    if (!nextInventory) return;

    setActiveInventory(inventoryId);
    setSearchTerm('');
    handleCloseAddForm();
    setNewItem({
      name: '',
      stock: 0,
      price: 0,
      cost_price: 0,
      commission_pct: 10,
      category: nextInventory.defaultCategory,
      image_url: '',
      owner_staff_id: null,
      cost_price_dirty: false,
      price_dirty: false,
      stock_dirty: false,
      commission_pct_dirty: false
    });
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '80px' : '40px' }}>
      <header style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        gap: '20px',
        marginBottom: isMobile ? '20px' : '24px',
        paddingRight: '48px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: '800', letterSpacing: '-0.5px', lineHeight: '1.2' }}>Control de <span className="text-gold">Stock</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: isMobile ? '13px' : '15px' }}>Gestión de productos y suministros críticos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button 
            className="btn-gold" 
            onClick={async () => {
              setShowHistoryModal(true);
              setLoadingHistory(true);
              try {
                const data = await dataService.getInventoryMovements();
                setHistory(data.filter(move => belongsToInventory(move.inventory, activeInventory)));
              } catch (e) {
                console.error(e);
              } finally {
                setLoadingHistory(false);
              }
            }} 
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--gold-primary)', border: '1px solid rgba(255, 255, 255, 0.2)',
              flex: isMobile ? '1 1 45%' : 'none', justifyContent: 'center', fontSize: isMobile ? '13px' : '14px', padding: isMobile ? '12px 8px' : '12px 16px', whiteSpace: 'nowrap'
            }}
          >
            <History size={18} style={{ marginRight: '6px' }} />
            {isMobile ? 'Historial' : 'Ver Historial'}
          </button>

            <button 
              onClick={() => {
                if (showAddForm) {
                  handleCloseAddForm();
                } else {
                  setShowAddForm(true);
                  setEditingItem(null);
                  setNewItem({ 
                    name: '', 
                    stock: 0, 
                    price: 0, 
                    cost_price: 0, 
                    commission_pct: 10,
                    category: selectedInventory.defaultCategory, 
                    image_url: '', 
                    owner_staff_id: null, 
                    cost_price_dirty: false, 
                    price_dirty: false, 
                    stock_dirty: false, 
                    commission_pct_dirty: false 
                  });
                }
              }}
              style={{ 
                WebkitTapHighlightColor: 'transparent', outline: 'none',
                flex: isMobile ? '1 1 45%' : 'none', justifyContent: 'center', fontSize: isMobile ? '13px' : '14px', padding: isMobile ? '12px 8px' : '12px 16px', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: showAddForm ? 'rgba(255, 69, 58, 0.1)' : 'var(--gold-primary)', border: showAddForm ? '1px solid rgba(255, 69, 58, 0.3)' : 'none', color: showAddForm ? '#ff453a' : 'black', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', fontWeight: '850'
              }}
            >
              {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Cancelar' : (isMobile ? 'Producto' : 'Nuevo Producto')}
            </button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Seleccionar inventario"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(180px, 1fr))',
          gap: isMobile ? '8px' : '12px',
          marginBottom: isMobile ? '24px' : '32px'
        }}
      >
        {INVENTORY_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeInventory === tab.id;
          const itemCount = inventory.filter(item => belongsToInventory(item, tab.id)).length;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleInventoryChange(tab.id)}
              style={{
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                minHeight: isMobile ? '54px' : '64px',
                padding: isMobile ? '12px 14px' : '14px 18px',
                borderRadius: '16px',
                border: `1px solid ${isActive ? 'rgba(17, 17, 17,0.7)' : 'rgba(255,255,255,0.08)'}`,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(17, 17, 17,0.2), rgba(17, 17, 17,0.06))'
                  : 'rgba(255,255,255,0.025)',
                color: isActive ? 'var(--gold-primary)' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 12px 28px rgba(0,0,0,0.25), inset 0 0 20px rgba(17, 17, 17,0.04)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'background 0.25s ease, box-shadow 0.25s ease, color 0.25s ease',
                textAlign: 'left'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <Icon size={19} />
                <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '850', lineHeight: '1.2' }}>
                  {isMobile ? tab.shortLabel : tab.label}
                </span>
              </span>
              <span style={{
                minWidth: '26px',
                height: '26px',
                padding: '0 7px',
                borderRadius: '999px',
                background: isActive ? 'var(--gold-primary)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#080808' : 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '900'
              }}>
                {itemCount}
              </span>
            </button>
          );
        })}
      </div>

      {(showAddForm || isFormExiting) && (
        <div className={`glass-card ${isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'}`} style={{ transition: 'none', marginBottom: '32px', borderRadius: '28px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '800' }}>
            Nuevo registro · <span className="text-gold">{selectedInventory.label}</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <FieldLabel required>Nombre</FieldLabel>
              <input type="text" placeholder="Ej. Cera Gold Premium" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: formatProductName(e.target.value)})} onBlur={(e) => setNewItem({...newItem, name: formatProductName(e.target.value).trim()})} style={{ width: '100%', height: '48px' }} />
            </div>
            <PandaSelect 
              label="CATEGORÍA"
              value={newItem.category}
              onChange={(val) => setNewItem({...newItem, category: val})}
              options={[
                ...(activeInventory === 'retail' ? [
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ShoppingCart size={14} color="var(--gold-primary)"/> Para Venta</div>, value: 'Venta' }
                ] : []),
                ...(activeInventory === 'cafe' ? [
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Coffee size={14} color="#111111"/> Bebidas</div>, value: 'Bebidas' },
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Croissant size={14} color="#ff9f0a"/> Alimentos</div>, value: 'Alimentos' },
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Package size={14} color="var(--text-muted)"/> Insumos de Café</div>, value: 'Insumos Café' }
                ] : []),
                ...(activeInventory === 'tools' ? [
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Wrench size={14} color="#007aff"/> Herramienta</div>, value: 'Herramienta' },
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Scissors size={14} color="#ff3b30"/> Accesorio</div>, value: 'Accesorios' },
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Coffee size={14} color="#111111"/> Uso Interno</div>, value: 'Uso Interno' }
                ] : [])
              ]}
            />

            {activeInventory === 'tools' && (
              <PandaSelect 
                label="ASIGNAR A"
                placeholder="Selecciona odontólogo"
                value={newItem.owner_staff_id}
                onChange={(val) => setNewItem({...newItem, owner_staff_id: val})}
                options={[
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Store size={14} color="var(--gold-primary)"/> Local / General</div>, value: null },
                  ...staff.map(s => ({ label: s.name, value: s.id, imageUrl: s.image_url || s.avatar_url || '', avatarFallback: (s.name || '?').trim().charAt(0).toUpperCase(), subtitle: (s.role || 'Profesional').split('|')[0] }))
                ]}
              />
            )}
            <div>
              <FieldLabel>Foto</FieldLabel>
              <div 
                onClick={() => setShowCamera(true)}
                style={{ 
                  height: newItem.image_url ? '120px' : '48px', 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  border: '1px dashed rgba(255,255,255,0.15)', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  flexDirection: newItem.image_url ? 'column' : 'row',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
              >
                {newItem.image_url ? (
                  <>
                     <img loading="lazy" src={newItem.image_url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                       <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                         <Camera size={20} color="var(--gold-primary)" />
                       </div>
                       <span style={{ fontSize: '12px', color: 'white', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>Tocar para cambiar foto</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={18} color="var(--gold-primary)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tomar o subir foto...</span>
                  </>
                )}
              </div>
            </div>

            {/* Dynamic Price Fields */}
            <div>
              <FieldLabel required>Precio Costo</FieldLabel>
              <input 
                type="number" 
                placeholder="0.00" 
                value={newItem.cost_price === 0 && !newItem.cost_price_dirty ? '' : newItem.cost_price} 
                onChange={(e) => setNewItem({...newItem, cost_price: e.target.value === '' ? '' : Number(e.target.value), cost_price_dirty: true})} 
                style={{ width: '100%', height: '48px' }} 
              />
            </div>

            {(activeInventory === 'retail' || activeInventory === 'cafe') && (
              <div>
                <FieldLabel required>Precio Venta</FieldLabel>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={newItem.price === 0 && !newItem.price_dirty ? '' : newItem.price} 
                  onChange={(e) => setNewItem({...newItem, price: e.target.value === '' ? '' : Number(e.target.value), price_dirty: true})} 
                  style={{ width: '100%', height: '48px' }} 
                />
              </div>
            )}

            {activeInventory === 'retail' && (
              <div>
                <FieldLabel>Comisión</FieldLabel>
                <input 
                  type="number" 
                  placeholder="10" 
                  value={newItem.commission_pct === 10 && !newItem.commission_pct_dirty ? '' : newItem.commission_pct} 
                  onChange={(e) => setNewItem({...newItem, commission_pct: e.target.value === '' ? '' : Number(e.target.value), commission_pct_dirty: true})} 
                  style={{ width: '100%', height: '48px' }} 
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>STOCK INICIAL</label>
              <input 
                type="number" 
                placeholder="0" 
                value={newItem.stock === 0 && !newItem.stock_dirty ? '' : newItem.stock} 
                onChange={(e) => setNewItem({...newItem, stock: e.target.value === '' ? '' : Number(e.target.value), stock_dirty: true})} 
                style={{ width: '100%', height: '48px' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn-gold"
                onClick={handleAddItem}
                disabled={saving}
                style={{ width: '100%', height: '48px', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                {saving ? <Loader2 className="animate-spin" /> : 'Registrar Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatedModal isOpen={showCamera}>
        {(overlayClass, cardClass) => (
          <PandaCamera 
            onCapture={(img) => setNewItem({...newItem, image_url: img})} 
            onClose={() => setShowCamera(false)} 
            overlayClass={overlayClass}
            cardClass={cardClass}
          />
        )}
      </AnimatedModal>

      {/* Search & Alerts Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder={`Buscar en ${selectedInventory.label.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-search-bar focus-ring"
            style={{ width: '100%', paddingLeft: '48px', height: '48px', transition: 'all 0.3s' }}
          />
        </div>
         {lowStockCount > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '12px', 
            backgroundColor: 'rgba(255, 69, 58, 0.08)', 
            padding: '14px 20px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255,69,58,0.15)',
            color: 'rgba(255, 69, 58, 0.9)',
            fontSize: '13px',
            fontWeight: '750'
          }}>
            <AlertTriangle size={16} /> {lowStockCount} {lowStockCount === 1 ? 'Producto' : 'Productos'} con Stock Bajo
          </div>
        )}

        <div style={{ display: isMobile ? 'none' : 'flex', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px', flex: isMobile ? '1 1 100%' : 'none', justifyContent: 'space-between' }}>
          <button 
            onClick={() => setViewMode('grid')}
            style={{ 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '8px', 
              backgroundColor: viewMode === 'grid' ? 'var(--gold-primary)' : 'transparent',
              color: viewMode === 'grid' ? 'black' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '800',
              flex: isMobile ? 1 : 'none',
              justifyContent: 'center'
            }}
          >
            <Package size={16} /> Cuadrícula
          </button>
          <button 
            onClick={() => setViewMode('list')}
            style={{ 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: '8px', 
              backgroundColor: viewMode === 'list' ? 'var(--gold-primary)' : 'transparent',
              color: viewMode === 'list' ? 'black' : 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '800',
              flex: isMobile ? 1 : 'none',
              justifyContent: 'center'
            }}
          >
            <Search size={16} style={{ transform: 'rotate(90deg)' }} /> Lista
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid items={9} itemHeight={140} minWidth={220} style={{ padding: '4px' }} />
      ) : filteredInventory.length === 0 ? (
        <div style={{
          transition: 'none',
          textAlign: 'center',
          padding: '80px',
          borderRadius: '32px',
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 16px 40px -12px rgba(0, 0, 0, 0.7)'
        }}>
          <Package size={64} color="rgba(255,255,255,0.05)" style={{ marginBottom: '24px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>No hay productos que coincidan.</p>
        </div>
      ) : viewMode === 'list' && !isMobile ? (
        <div className="animate-slide-up" style={{ background: 'var(--bg-secondary)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: '80px' }}>
            <div style={{ width: '100%', overflowX: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'auto' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: isMobile ? '12px 6px 12px 16px' : '20px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)' }}>PRODUCTO</th>
                    <th style={{ padding: isMobile ? '12px 6px' : '20px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', display: isMobile ? 'none' : 'table-cell' }}>CATEGORÍA</th>
                    <th style={{ padding: isMobile ? '12px 6px' : '20px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', textAlign: 'center' }}>STOCK</th>
                    <th style={{ padding: isMobile ? '12px 6px' : '20px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', textAlign: 'right' }}>PRECIO</th>
                    <th style={{ padding: isMobile ? '12px 16px 12px 6px' : '20px', fontSize: isMobile ? '10px' : '11px', fontWeight: '900', color: 'var(--text-muted)', textAlign: 'right' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="table-row-hover">
                      <td style={{ padding: isMobile ? '12px 6px 12px 16px' : '16px 20px', maxWidth: isMobile ? '120px' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontWeight: '800', fontSize: isMobile ? '13px' : '14px', lineHeight: '1.2' }}>{formatProductName(item.name)}</span>
                           {isMobile && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.category}</span>}
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '8px 4px' : '16px 20px', display: isMobile ? 'none' : 'table-cell' }}>
                        <span style={{ fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', color: 'var(--text-secondary)', fontWeight: '800' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: isMobile ? '8px 4px' : '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <span style={{ 
                            fontWeight: '950', 
                            fontSize: isMobile ? '13px' : '15px',
                            color: (item.stock <= 5 && item.category !== 'Accesorios') ? '#ff4d4d' : 'white'
                          }}>
                            {item.stock}
                          </span>
                          {(item.stock <= 5 && item.category !== 'Accesorios') && <AlertTriangle size={12} color="#ff4d4d" />}
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '12px 6px' : '16px 20px', textAlign: 'right' }}>
                        <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: isMobile ? '13px' : '14px' }}>${item.price?.toFixed(2) || '0.00'}</div>
                      </td>
                      <td style={{ padding: isMobile ? '12px 16px 12px 6px' : '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                          <button 
                            onClick={() => handeAdjustStock(item.id, item.stock, -1)}
                            className="action-btn" style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', padding: 0 }}
                          >
                            <Minus size={14} />
                          </button>
                          <button 
                            onClick={() => handeAdjustStock(item.id, item.stock, 1)}
                            className="action-btn" style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', padding: 0 }}
                          >
                            <Plus size={14} />
                          </button>
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="action-btn" style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', padding: 0, backgroundColor: 'rgba(255, 255, 255,0.1)', color: 'var(--gold-primary)' }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="action-btn" style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', padding: 0, backgroundColor: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
                          >
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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredInventory.map(item => {
            const isLowStock = item.stock <= 5 && item.category !== 'Accesorios';
            return (
              <div key={item.id} className="glass-card inventory-card animate-scale-in" style={{ 
                position: 'relative',
                borderRadius: '24px',
                transition: 'none',
                boxShadow: isLowStock ? '0 10px 30px rgba(255, 255, 255, 0.1)' : '0 10px 30px rgba(0,0,0,0.2)',
                background: isLowStock ? 'linear-gradient(135deg, rgba(28,28,30,0.9), rgba(255, 255, 255, 0.05))' : 'var(--bg-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="inventory-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setEditingItem(item)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer', padding: isMobile ? '10px' : '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--gold-primary)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Edit3 size={isMobile ? 18 : 16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer', padding: isMobile ? '10px' : '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#ff453a'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={isMobile ? 18 : 16} />
                      </button>
                    </div>
                    <span style={{ 
                      fontSize: '10px', 
                      backgroundColor: 'rgba(255,255,255,0.05)', 
                      padding: '4px 12px', 
                      borderRadius: '20px',
                      color: 'var(--text-secondary)',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {item.category}
                    </span>
                  </div>
                  {isLowStock && (
                    <span className="animate-pulse" style={{ fontSize: '10px', fontWeight: '900', color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '1px' }}>
                      <AlertTriangle size={14} color="#ff4d4d" fill="rgba(255, 77, 77, 0.2)" /> STOCK BAJO
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '16px', 
                    background: item.image_url ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, rgba(255, 255, 255,0.08), rgba(0,0,0,0.4))', 
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.image_url ? (
                       <img loading="lazy" src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (() => {
                        const n = (item.name || '').toLowerCase();
                        const c = (item.category || '').toLowerCase();
                        if (n.includes('café') || n.includes('cafe') || n.includes('frapuchino') || n.includes('latte') || n.includes('capuccino') || n.includes('americano') || n.includes('espresso') || n.includes('guayoyo') || c.includes('café')) return <Coffee size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        if (n.includes('agua')) return <GlassWater size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        if (n.includes('polar') || n.includes('solera') || n.includes('malta')) return <Beer size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        if (n.includes('refresco') || n.includes('gatorade') || n.includes('yukery') || n.includes('soda')) return <CupSoda size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        if (c.includes('bebida')) return <CupSoda size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        if (c.includes('herramienta') || n.includes('maquina') || n.includes('clipper') || n.includes('trimmer')) return <Wrench size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        if (c.includes('accesorios') || n.includes('tijera') || n.includes('navaja') || n.includes('capa')) return <Scissors size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        if (c.includes('venta')) return <ShoppingBag size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                        return <Package size={24} color="var(--gold-primary)" style={{ opacity: 0.6 }} />;
                      })()
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '850', letterSpacing: '-0.3px', margin: 0 }}>{formatProductName(item.name)}</h4>
                      {item.category === 'Herramienta' && item.owner_staff_id && (
                        <div style={{ 
                          fontSize: '10px', 
                          fontWeight: '800', 
                          padding: '4px 8px', 
                          backgroundColor: 'rgba(255, 255, 255,0.1)', 
                          color: 'var(--gold-primary)', 
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255,0.2)'
                        }}>
                          ASIGNADA A {staff.find(s => s.id === item.owner_staff_id)?.name.split(' ')[0].toUpperCase() || 'DESCONOCIDO'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginTop: '4px' }}>
                      {(item.category === 'Venta' || item.category === 'Accesorios') ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>VENTA</span>
                            <div style={{ fontSize: '20px', fontWeight: '950', color: 'var(--gold-primary)', lineHeight: '1.1' }}>
                              <span style={{ fontSize: '13px', verticalAlign: 'super', marginRight: '2px' }}>$</span>
                              {item.price?.toFixed(2) || '0.00'}
                            </div>
                            {rates?.usd > 0 && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', marginTop: '2px' }}>
                                ≈ {Math.round(item.price * rates.usd).toLocaleString()} Bs.
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>COSTO</span>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                              <span style={{ fontSize: '9px', verticalAlign: 'super', marginRight: '2px' }}>$</span>
                              {item.cost_price?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>COSTO (USO INTERNO)</span>
                          <div style={{ fontSize: '20px', fontWeight: '950', color: 'white' }}>
                            <span style={{ fontSize: '12px', verticalAlign: 'super', marginRight: '2px' }}>$</span>
                            {item.cost_price?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>ALMACÉN</div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: 'rgba(255,255,255,0.04)', 
                    borderRadius: '100px', 
                    padding: '4px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <button 
                      onClick={() => handeAdjustStock(item.id, item.stock, -1)}
                      style={{ 
                        width: isMobile ? '40px' : '32px', height: isMobile ? '40px' : '32px', borderRadius: '50%', border: 'none', background: 'transparent', 
                        color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' 
                      }}
                      onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='white'; }}
                      onMouseOut={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-secondary)'; }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ 
                      fontSize: isMobile ? '20px' : '18px', fontWeight: '950', minWidth: '40px', textAlign: 'center', 
                      color: isLowStock ? 'var(--gold-primary)' : 'white',
                      textShadow: isLowStock ? '0 0 10px rgba(255, 255, 255,0.5)' : 'none'
                    }}>
                      {item.stock}
                    </span>
                    <button 
                      onClick={() => handeAdjustStock(item.id, item.stock, 1)}
                      style={{ 
                        width: isMobile ? '40px' : '32px', height: isMobile ? '40px' : '32px', borderRadius: '50%', border: 'none', background: 'transparent', 
                        color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' 
                      }}
                      onMouseOver={e => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='white'; }}
                      onMouseOut={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-secondary)'; }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditInventoryModal 
        isOpen={!!editingItem}
        item={editingItem || {}} 
        staff={staff}
        onClose={() => setEditingItem(null)} 
        onSave={async (updates) => {
          try {
            // Sanitize updates
            const { cost_price_dirty, price_dirty, stock_dirty, ...cleanUpdates } = updates;
            if (cleanUpdates.name) {
              cleanUpdates.name = formatProductName(cleanUpdates.name);
            }
            await dataService.updateInventoryItem(editingItem.id, cleanUpdates);
            fetchInventory();
            setEditingItem(null);
            showToast('Producto actualizado');
          } catch (error) {
            showToast('Error al actualizar producto', 'error');
          }
        }}
      />

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.6; transform: scale(0.95); }
        }
        .table-row-hover:hover {
          background-color: rgba(255,255,255,0.02) !important;
        }
      `}</style>

      <AnimatedModal isOpen={showHistoryModal}>
        {(overlayClass, cardClass) => {
          const filteredHistory = history.filter(move => {
            if (historyFilter === 'today') {
              if (new Date(move.created_at).toDateString() !== new Date().toDateString()) return false;
            } else if (historyFilter === 'week') {
              const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              if (new Date(move.created_at) < oneWeekAgo) return false;
            } else if (historyFilter === 'month') {
              const now = new Date();
              const d = new Date(move.created_at);
              if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
            }
            if (historySearch.trim()) {
              const term = historySearch.toLowerCase();
              const productName = (move.inventory?.name || '').toLowerCase();
              const reason = (move.reason || '').toLowerCase();
              if (!productName.includes(term) && !reason.includes(term)) return false;
            }
            return true;
          });

          const entries = filteredHistory.filter(m => m.type === 'entry');
          const exits = filteredHistory.filter(m => m.type === 'exit');
          const totalIn = entries.reduce((s, m) => s + (m.amount || 0), 0);
          const totalOut = exits.reduce((s, m) => s + (m.amount || 0), 0);

          const groupedByDate = {};
          filteredHistory.forEach(move => {
            const d = new Date(move.created_at);
            const key = d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
            if (!groupedByDate[key]) groupedByDate[key] = [];
            groupedByDate[key].push(move);
          });
          const dateGroups = Object.entries(groupedByDate);

          return (
            <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))' }}>
              <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ transition: 'none', maxWidth: 'min(860px, 92vw)', width: '100%', borderRadius: '28px', maxHeight: '92vh', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset' }}>
                
                {/* ── HEADER ── */}
                <div style={{ padding: isMobile ? '28px 22px 0' : '32px 36px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontWeight: '900', fontSize: isMobile ? '22px' : '26px', lineHeight: '1.15', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15), rgba(17, 17, 17,0.05))', border: '1px solid rgba(17, 17, 17,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <History size={20} color="var(--gold-primary)" />
                      </div>
                      Historial de Movimientos
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px', paddingLeft: '52px' }}>Registro completo de entradas y salidas de almacén.</p>
                  </div>
                  <button onClick={() => setShowHistoryModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
                    <X size={18} />
                  </button>
                </div>

                {/* ── STATS ROW ── */}
                <div style={{ padding: isMobile ? '20px 22px 0' : '24px 36px 0', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Entradas', value: `+${totalIn}`, count: entries.length, color: '#32d74b', bg: 'rgba(50,215,75,0.06)', border: 'rgba(50,215,75,0.12)', icon: ArrowDownLeft },
                    { label: 'Salidas', value: `-${totalOut}`, count: exits.length, color: '#ff453a', bg: 'rgba(255,69,58,0.06)', border: 'rgba(255,69,58,0.12)', icon: ArrowUpRight },
                    { label: 'Total', value: filteredHistory.length, count: null, color: 'var(--gold-primary)', bg: 'rgba(17, 17, 17,0.06)', border: 'rgba(17, 17, 17,0.12)', icon: TrendingUp }
                  ].map((stat, i) => (
                    <div key={i} style={{ minWidth: 0, background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: '16px', padding: isMobile ? '14px 8px' : '16px 18px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'center', textAlign: isMobile ? 'center' : 'left', gap: isMobile ? '6px' : '12px' }}>
                      <div style={{ width: isMobile ? '30px' : '38px', height: isMobile ? '30px' : '38px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <stat.icon size={isMobile ? 14 : 18} color={stat.color} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: '900', color: stat.color, lineHeight: '1.1' }}>{stat.value}</div>
                        <div style={{ fontSize: isMobile ? '10px' : '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '1px' }}>{isMobile ? stat.label : `${stat.label}${stat.count !== null ? ` (${stat.count})` : ''}`}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── SEARCH + FILTERS ── */}
                <div style={{ padding: isMobile ? '16px 22px 0' : '20px 36px 0', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      placeholder="Buscar producto o motivo..."
                      className="search-subtle"
                      style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    {historySearch && (
                      <button onClick={() => setHistorySearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', width: '20px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {[{ label: 'Todos', value: 'all' }, { label: 'Hoy', value: 'today' }, { label: 'Semana', value: 'week' }, { label: 'Mes', value: 'month' }].map(tab => (
                      <button
                        key={tab.value}
                        onClick={() => setHistoryFilter(tab.value)}
                        style={{
                          padding: isMobile ? '8px 12px' : '9px 16px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: '700',
                          backgroundColor: historyFilter === tab.value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
                          color: historyFilter === tab.value ? 'black' : 'rgba(255,255,255,0.5)',
                          border: `1px solid ${historyFilter === tab.value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.06)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── CONTENT ── */}
                <div style={{ padding: isMobile ? '16px 22px 28px' : '20px 36px 32px' }}>
                  {loadingHistory ? (
                    <SkeletonList rows={4} rowHeight={56} />
                  ) : filteredHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Package size={28} color="rgba(255,255,255,0.12)" />
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>{historySearch ? `Sin resultados para "${historySearch}"` : 'No hay movimientos en este período.'}</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '440px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }} className="panda-scrollbar">
                      {dateGroups.map(([dateLabel, moves]) => (
                        <div key={dateLabel} style={{ marginBottom: '20px' }}>
                          {/* Date Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <CalendarDays size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{dateLabel}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>({moves.length})</span>
                          </div>

                          {/* Movement Cards */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {moves.map(move => {
                              const isEntry = move.type === 'entry';
                              return (
                                <div key={move.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMobile ? '12px 14px' : '12px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                                  {/* Type Indicator */}
                                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isEntry ? 'rgba(50,215,75,0.08)' : 'rgba(255,69,58,0.08)', border: `1px solid ${isEntry ? 'rgba(50,215,75,0.15)' : 'rgba(255,69,58,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {isEntry ? <ArrowDownLeft size={16} color="#32d74b" /> : <ArrowUpRight size={16} color="#ff453a" />}
                                  </div>

                                  {/* Info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatProductName(move.inventory?.name) || 'Producto Eliminado'}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {move.reason || 'Sin motivo'}
                                    </div>
                                  </div>

                                  {/* Time */}
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                                    {new Date(move.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </div>

                                  {/* Amount */}
                                  <div style={{ fontSize: '15px', fontWeight: '900', color: isEntry ? '#32d74b' : '#ff453a', minWidth: '48px', textAlign: 'right', flexShrink: 0 }}>
                                    {isEntry ? '+' : '-'}{move.amount}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      </AnimatedModal>
    </div>
  );
};

const EditInventoryModal = ({ isOpen, item, staff = [], onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...item });
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...item });
      setShowCamera(false);
    }
  }, [isOpen, item]);

  const handleSave = async () => {
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
          <div className={`glass-card ${cardClass.replace('global-modal-card', '')} panda-scrollbar`} style={{ transition: 'none', maxWidth: 'min(520px, 90vw)', width: '100%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', padding: '0', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '12px', 
                  backgroundColor: 'rgba(17, 17, 17,0.1)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(17, 17, 17,0.2)'
                }}>
                  <Package size={20} color="var(--gold-primary)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', letterSpacing: '-0.3px', margin: 0 }}>
                  Editar Producto
                </h3>
              </div>
              <button 
                onClick={onClose} 
                style={{ 
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>NOMBRE</label>
                <input type="text" className="panda-input" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: formatProductName(e.target.value)})} onBlur={(e) => setFormData({...formData, name: formatProductName(e.target.value).trim()})} style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.02)' }} />
              </div>

              <PandaSelect 
                label="CATEGORÍA"
                value={formData.category}
                onChange={(val) => setFormData({...formData, category: val})}
                options={[
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ShoppingCart size={14} color="var(--gold-primary)"/> Para Venta</div>, value: 'Venta' },
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Coffee size={14} color="#111111"/> Uso Interno</div>, value: 'Uso Interno' },
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Scissors size={14} color="#ff3b30"/> Accesorios</div>, value: 'Accesorios' },
                  { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Wrench size={14} color="#007aff"/> Herramienta</div>, value: 'Herramienta' }
                ]}
              />

              {formData.category === 'Herramienta' && (
                <PandaSelect 
                  label="ASIGNAR A"
                  placeholder="Selecciona odontólogo"
                  value={formData.owner_staff_id}
                  onChange={(val) => setFormData({...formData, owner_staff_id: val})}
                  options={[
                    { label: <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Store size={14} color="var(--gold-primary)"/> Local / General</div>, value: null },
                    ...staff.map(member => ({ label: member.name, value: member.id, imageUrl: member.image_url || member.avatar_url || '', avatarFallback: (member.name || '?').trim().charAt(0).toUpperCase(), subtitle: (member.role || 'Profesional').split('|')[0] }))
                  ]}
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO COSTO ($)</label>
                  <input type="number" className="panda-input" value={formData.cost_price || 0} onChange={(e) => setFormData({...formData, cost_price: Number(e.target.value)})} style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.02)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PRECIO VENTA ($)</label>
                  <input type="number" className="panda-input" value={formData.price || 0} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.02)' }} />
                </div>
              </div>

              {(formData.category === 'Venta' || formData.category === 'Accesorios') && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>COMISIÓN VENDEDOR (%)</label>
                  <input type="number" className="panda-input" value={formData.commission_pct ?? 10} onChange={(e) => setFormData({...formData, commission_pct: Number(e.target.value)})} style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.02)' }} />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>FOTO DEL PRODUCTO</label>
                <div 
                  onClick={() => setShowCamera(true)}
                  style={{ 
                    height: formData.image_url ? '120px' : '48px', 
                    backgroundColor: 'rgba(255,255,255,0.02)', 
                    border: '1px dashed rgba(255,255,255,0.15)', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    flexDirection: formData.image_url ? 'column' : 'row',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                >
                  {formData.image_url ? (
                    <>
                       <img loading="lazy" src={formData.image_url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                         <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                           <Camera size={20} color="var(--gold-primary)" />
                         </div>
                         <span style={{ fontSize: '12px', color: 'white', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.8)', backgroundColor: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>Tocar para cambiar foto</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera size={18} color="rgba(255,255,255,0.3)" />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tomar o subir foto...</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '12px', padding: '0 24px 24px' }}>
              <button 
                onClick={onClose} 
                style={{ 
                  flex: 1, 
                  padding: '16px', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  backgroundColor: 'rgba(255,255,255,0.03)', 
                  color: 'white', 
                  fontSize: '14px', 
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                className="btn-gold" 
                style={{ 
                  flex: 2, 
                  padding: '16px', 
                  borderRadius: '16px', 
                  fontSize: '15px', 
                  fontWeight: '800',
                  boxShadow: '0 4px 12px rgba(17, 17, 17, 0.15)'
                }} 
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
              </button>
            </div>

            <AnimatedModal isOpen={showCamera}>
              {(overlayClass, cardClass) => (
                <PandaCamera 
                  onCapture={(img) => { setFormData({...formData, image_url: img}); setShowCamera(false); }} 
                  onClose={() => setShowCamera(false)} 
                  overlayClass={overlayClass}
                  cardClass={cardClass}
                />
              )}
            </AnimatedModal>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default InventoryModule;
