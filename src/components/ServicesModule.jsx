import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Clock, Scissors, Rocket,
  Droplets, Zap, Check, X,
  Settings, LayoutList, Star, Crown,
  LayoutGrid, Table, Eye, Info, Pencil,
  Sparkles, Smile, Heart, Wind, Palette,
  Brush, Flower2, UserRound, Waves, Feather,
  PenTool, Flame, Coffee, Gem, Shield, Crosshair
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { SkeletonGrid } from './Skeleton';
import { useDialog } from '../context/DialogContext';
import { useNotifs } from '../context/NotificationContext';
import PandaSelect from './PandaSelect';
import AnimatedModal from './AnimatedModal';
import { formatServiceName } from '../utils/stringUtils';
import FieldLabel from './FieldLabel';

// Custom SVG: nail polish bottle
const NailPolishIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <rect x="10" y="6" width="4" height="3" />
    <rect x="6" y="9" width="12" height="11" rx="2" />
    <line x1="12" y1="20" x2="12" y2="23" />
  </svg>
);

// Custom SVG: Beard
const BeardIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8c0 6 3 13 8 13s8-7 8-13" />
    <path d="M7.5 11.5c0 2 2 3.5 4.5 3.5s4.5-1.5 4.5-3.5" />
    <path d="M10 9.5c0-1 1-1.5 2-1.5s2 .5 2 1.5" />
  </svg>
);

// Custom SVG: Combined Scissors + Beard
const CorteYBarbaIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <g transform="translate(-1, -1) scale(0.75)">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </g>
    <g transform="translate(7, 7) scale(0.75)">
      <path d="M4 8c0 6 3 13 8 13s8-7 8-13" />
      <path d="M7.5 11.5c0 2 2 3.5 4.5 3.5s4.5-1.5 4.5-3.5" />
      <path d="M10 9.5c0-1 1-1.5 2-1.5s2 .5 2 1.5" />
    </g>
  </svg>
);

const AVAILABLE_ICONS = [
  { name: 'Scissors',        label: 'Corte / Clínica' },
  { name: 'BeardIcon',       label: 'Barba / Perfilado' },
  { name: 'CorteYBarbaIcon', label: 'Corte + Barba' },
  { name: 'PenTool',         label: 'Tatuaje / Piercing' },
  { name: 'Flame',       label: 'Toalla Caliente / Spa' },
  { name: 'Droplets',    label: 'Limpieza / Hidratación' },
  { name: 'Palette',     label: 'Colorimetría / Tintes' },
  { name: 'Wind',        label: 'Secado / Blower' },
  { name: 'Coffee',      label: 'Bebidas' },
  { name: 'Zap',         label: 'Máquina / Express' },
  { name: 'Crosshair',   label: 'Precisión / Cejas' },
  { name: 'Waves',       label: 'Keratina / Alisado' },
  { name: 'Shield',      label: 'Protección / Cuidado' },
  { name: 'Crown',       label: 'VIP / Dientes Sanos Elite' },
  { name: 'Gem',         label: 'Premium / Exclusivo' },
  { name: 'Star',        label: 'Tendencias / Extras' }
];

const getIconComponent = (iconName, size = 20) => {
  // Auto-replace old girly icons with barber equivalents for rendering fallback
  if (['Flower2', 'Heart', 'Feather', 'Smile'].includes(iconName)) iconName = 'Flame';
  if (iconName === 'NailPolish') iconName = 'Droplets';
  if (iconName === 'Brush') iconName = 'PenTool';
  if (iconName === 'Sparkles') iconName = 'Star';
  if (iconName === 'UserRound') iconName = 'BeardIcon';

  switch (iconName) {
    case 'CorteYBarbaIcon': return <CorteYBarbaIcon size={size} />;
    case 'Scissors':    return <Scissors size={size} />;
    case 'BeardIcon':   return <BeardIcon size={size} />;
    case 'PenTool':     return <PenTool size={size} />;
    case 'Flame':       return <Flame size={size} />;
    case 'Droplets':    return <Droplets size={size} />;
    case 'Palette':     return <Palette size={size} />;
    case 'Wind':        return <Wind size={size} />;
    case 'Coffee':      return <Coffee size={size} />;
    case 'Zap':         return <Zap size={size} />;
    case 'Crosshair':   return <Crosshair size={size} />;
    case 'Waves':       return <Waves size={size} />;
    case 'Shield':      return <Shield size={size} />;
    case 'Crown':       return <Crown size={size} />;
    case 'Gem':         return <Gem size={size} />;
    case 'Star':        return <Star size={size} />;
    default:            return <Zap size={size} />;
  }
};

const ServicesModule = ({ isMobile, currency, rates }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('panda_servicesViewMode') || 'grid');
  useEffect(() => {
    localStorage.setItem('panda_servicesViewMode', viewMode);
  }, [viewMode]);
  const [isExtrasModalOpen, setIsExtrasModalOpen] = useState(false);
  const [isBillableExtrasModalOpen, setIsBillableExtrasModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isStrategiesModalOpen, setIsStrategiesModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryIcon, setSelectedCategoryIcon] = useState('Scissors');
  const [editingCategory, setEditingCategory] = useState(null);
  const [newStrategyValue, setNewStrategyValue] = useState('');
  const [newStrategyLabel, setNewStrategyLabel] = useState('');
  const [baseItems, setBaseItems] = useState([]);
  const [billableExtras, setBillableExtras] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editingExtra, setEditingExtra] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('0.00');
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('0.00');
  const [newExtraCost, setNewExtraCost] = useState('2.00');
  const [selectedServiceDetail, setSelectedServiceDetail] = useState(null);
  const { showToast } = useNotifs();
  const { confirm } = useDialog();

  useEffect(() => {
    fetchServices();
    fetchBaseItems();
    fetchBillableExtras();
    fetchCategories();
    fetchStrategies();
  }, []);

  const handleCloseAddForm = () => {
    setIsFormExiting(true);
    setTimeout(() => {
      setShowAddForm(false);
      setIsEditing(false);
      setIsFormExiting(false);
    }, 250);
  };

  const fetchServices = async () => {
    try {
      let data = await dataService.getServices();
      if ((!data || data.length === 0) && typeof dataService.ensureDentalServices === 'function') {
        data = await dataService.ensureDentalServices();
      }
      setServices(data || []);
    } catch (e) {
      showToast('Error al cargar servicios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseItems = async () => {
    try {
      const items = await dataService.getChecklistItems();
      setBaseItems(items || []);
    } catch (e) {
      console.error('Error fetching base items:', e);
      showToast('Error al cargar ítems incluidos.', 'error');
    }
  };

  const fetchBillableExtras = async () => {
    try {
      const data = await dataService.getExtras();
      setBillableExtras(data?.filter(e => e.name !== 'SYSTEM_CONFIG_RATES') || []);
    } catch (e) {
      showToast('Error al cargar extras cobrables.', 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await dataService.getServiceCategories();
      setCategories(data || []);
    } catch (e) {
      showToast('Error al cargar categorías.', 'error');
    }
  };

  const fetchStrategies = async () => {
    try {
      const data = await dataService.getServiceStrategies();
      setStrategies(data || []);
    } catch (e) {
      showToast('Error al cargar estrategias.', 'error');
    }
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      if (editingCategory) {
        await dataService.updateServiceCategory(
          editingCategory.name, 
          editingCategory.icon, 
          newCategoryName.trim(), 
          selectedCategoryIcon
        );
        showToast('Categoría actualizada.');
        setEditingCategory(null);
      } else {
        await dataService.addServiceCategory(newCategoryName.trim(), selectedCategoryIcon);
        showToast('Nueva categoría creada.');
      }
      setNewCategoryName('');
      setSelectedCategoryIcon('Scissors');
      await fetchCategories();
      await fetchServices();
    } catch (e) {
      showToast(editingCategory ? 'Error al actualizar categoría.' : 'Error al crear categoría.', 'error');
    }
  };

  const handleEditCategoryClick = (catObj) => {
    setEditingCategory(catObj);
    setNewCategoryName(catObj.name);
    setSelectedCategoryIcon(catObj.icon || getFallbackIconName(catObj.name));
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
    setSelectedCategoryIcon('Scissors');
  };

  const handleDeleteCategory = async (catObj) => {
    if (!await confirm(`¿Estás seguro de eliminar la categoría "${catObj.name}"?`)) return;
    try {
      await dataService.deleteServiceCategory(catObj.name, catObj.icon);
      await fetchCategories();
      showToast('Categoría eliminada.');
    } catch (e) {
      showToast('Error al eliminar categoría.', 'error');
    }
  };

  const handleAddStrategy = async () => {
    if (!newStrategyValue.trim() || !newStrategyLabel.trim()) {
      showToast('Debe ingresar el valor y la etiqueta.', 'warning');
      return;
    }
    try {
      await dataService.addServiceStrategy(newStrategyValue.trim(), newStrategyLabel.trim());
      setNewStrategyValue('');
      setNewStrategyLabel('');
      await fetchStrategies();
      showToast('Nueva estrategia creada.');
    } catch (e) {
      showToast('Error al crear estrategia.', 'error');
    }
  };

  const handleDeleteStrategy = async (value) => {
    if (!await confirm('¿Estás seguro de eliminar esta estrategia?')) return;
    try {
      await dataService.deleteServiceStrategy(value);
      await fetchStrategies();
      showToast('Estrategia eliminada.');
    } catch (e) {
      showToast('Error al eliminar estrategia.', 'error');
    }
  };

  const handleAddMasterChecklistItem = async () => {
    if (!newItemName) return;
    try {
      await dataService.addChecklistItem(newItemName, Number(newItemCost));
      setNewItemName('');
      setNewItemCost('0.50');
      await fetchBaseItems();
      showToast('Nuevo extra agregado al maestro.');
    } catch (e) {
      console.error('Error adding master checklist item:', e);
      showToast('Error al agregar extra.', 'error');
    }
  };

  const handleUpdateMasterItem = async (id, name, base_cost) => {
    try {
      await dataService.updateChecklistItem(id, { name, base_cost: Number(base_cost) });
      await fetchBaseItems();
      showToast('Ítem del checklist actualizado.');
    } catch (e) {
      showToast('Error al actualizar ítem.', 'error');
    }
  };

  const handleDeleteMasterItem = async (e, id, name) => {
    e.stopPropagation();
    if (!await confirm(`¿Eliminar "${name}" del checklist maestro?`)) return;
    try {
      await dataService.deleteChecklistItem(id);
      await fetchBaseItems();
      showToast('Ítem eliminado.');
    } catch (e) {
      showToast('Error al eliminar ítem.', 'error');
    }
  };

  const handleAddBillableExtra = async () => {
    if (!newExtraName) return;
    try {
      await dataService.addExtra({
        name: newExtraName,
        price: Number(newExtraPrice),
        cost: Number(newExtraCost)
      });
      setNewExtraName('');
      setNewExtraPrice('2.00');
      setNewExtraCost('0.50');
      await fetchBillableExtras();
      showToast('Servicio adicional (Extra) creado.');
    } catch (e) {
      showToast('Error al crear extra.', 'error');
    }
  };

  const handleUpdateBillableExtra = async (id, updates) => {
    const normalizedName = String(updates.name || '').trim();
    if (!normalizedName) {
      showToast('El nombre del extra no puede quedar vacío.', 'warning');
      return false;
    }
    try {
      await dataService.updateExtra(id, { ...updates, name: normalizedName });
      await fetchBillableExtras();
      showToast('Extra actualizado.');
      return true;
    } catch (e) {
      showToast('Error al actualizar extra.', 'error');
      return false;
    }
  };

  const handleDeleteBillableExtra = async (e, id, name) => {
    e.stopPropagation();
    if (!await confirm(`¿Archivar el extra "${name}"? Se mantendrá en el historial pero ya no se podrá seleccionar para nuevos servicios.`)) return;
    try {
      await dataService.deleteExtra(id);
      await fetchBillableExtras();
      showToast('Extra archivado correctamente.');
    } catch (e) {
      showToast('Error al archivar el extra.', 'error');
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!await confirm(`¿Archivar el servicio "${name}"? Se mantendrá en el historial pero ya no se podrá seleccionar.`)) return;
    try {
      setLoading(true);
      await dataService.deleteService(id);
      await fetchServices();
      showToast(`Servicio "${name}" archivado.`);
    } catch (e) {
      showToast('Error al archivar el servicio.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [isFormExiting, setIsFormExiting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formTab, setFormTab] = useState(0);
  const [newService, setNewService] = useState({ 
    name: '', 
    price: '', 
    icon: 'Scissors',
    category: 'Barbería',
    strategy_type: 'MVP',
    duration: 30,
    insumo_cost: 0,
    variable_cost: 0.50,
    included_items: [],
    is_tattoo: false
  });

  const handleEditClick = (service) => {
    setIsEditing(true);
    setNewService({
      id: service.id,
      name: service.name,
      price: service.price,
      icon: service.icon || 'Scissors',
      category: service.category,
      strategy_type: service.strategy_type || 'MVP',
      duration: service.duration || 30,
      description: service.description || '',
      included_items: service.included_items || [],
      is_tattoo: service.is_tattoo || false
    });
    setShowAddForm(true);
  };

  const handleCreateService = async () => {
    const isTattoo = (newService.category || '').toLowerCase().includes('tatuaj');
    if (!newService.name || !newService.price) return;
    try {
      setLoading(true);
      const serviceToSave = { ...newService, price: newService.price || 0 };
      if (isEditing && serviceToSave.id) {
        await dataService.updateService(serviceToSave.id, serviceToSave);
        showToast(`¡Servicio ${serviceToSave.name} actualizado!`);
      } else {
        await dataService.addService(serviceToSave);
        showToast(`¡Servicio ${serviceToSave.name} agregado al catálogo!`);
      }
      setNewService({ 
        name: '', 
        price: '', 
        category: 'Barbería',
        strategy_type: 'MVP',
        duration: 30,
        insumo_cost: 0,
        variable_cost: 0.50,
        description: '',
        included_items: [],
        is_tattoo: false
      });
      setIsEditing(false);
      setShowAddForm(false);
      await fetchServices();
    } catch (e) {
      showToast('Error al guardar el servicio.', 'error');
    } finally {
      setLoading(false);
    }
  };

   // Effect to auto-calculate insumo_cost based on items + variable
  useEffect(() => {
    const itemsTotal = baseItems
      .filter(item => newService.included_items?.includes(item.name))
      .reduce((sum, item) => sum + (Number(item.base_cost) || 0), 0);
    
    setNewService(prev => ({
      ...prev,
      insumo_cost: Number((itemsTotal + (Number(prev.variable_cost) || 0)).toFixed(2))
    }));
  }, [newService.included_items, newService.variable_cost, baseItems]);

  const getFallbackIconName = (catName, serviceName) => {
    const name = (catName || '').toLowerCase();
    const srvName = (serviceName || '').toLowerCase();
    
    if (srvName.includes('corte y barba') || srvName.includes('corte & barba')) return 'CorteYBarbaIcon';
    if (name.includes('barba')) return 'BeardIcon';
    if (name.includes('tatu')) return 'PenTool';
    if (name.includes('corte')) return 'Scissors';
    if (name.includes('color')) return 'Palette';
    if (name.includes('lavado')) return 'Droplets';
    return 'Scissors';
  };

  const getCategoryIcon = (catName, serviceName) => {
    const catObj = categories.find(c => c.name === catName);
    const iconName = catObj ? catObj.icon : null;
    return getIconComponent(iconName || getFallbackIconName(catName, serviceName), 20);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isMobile ? '120px' : '60px' }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '20px' : '0',
        marginBottom: '40px'
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', letterSpacing: '-0.5px' }}><span className="text-gold">Servicios</span></h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Define tu oferta y servicios adicionales.</p>
        </div>
        <div style={{ 
          display: isMobile ? 'grid' : 'flex', 
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'none',
          gap: '12px', 
          alignItems: 'center',
          width: isMobile ? '100%' : 'auto'
        }}>
          {/* View Toggles */}
          {!isMobile && (
            <div style={{ 
              display: 'flex', 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              borderRadius: '12px', 
              padding: '4px',
              border: '1px solid rgba(255,255,255,0.05)',
              marginRight: '12px'
            }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  backgroundColor: viewMode === 'grid' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--gold-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <LayoutGrid size={16} /> Tarjetas
              </button>
              <button 
                onClick={() => setViewMode('table')}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  backgroundColor: viewMode === 'table' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--gold-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <Table size={16} /> Tabla
              </button>
            </div>
          )}

          <button onClick={() => setIsCategoriesModalOpen(true)} style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? '100%' : 'auto', padding: '10px 16px', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s', cursor: 'pointer' }}>
            <Settings size={16} style={{ marginRight: '6px', color: 'var(--text-muted)' }} />
            Categorías
          </button>
          <button onClick={() => setIsBillableExtrasModalOpen(true)} style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? '100%' : 'auto', padding: '10px 16px', fontSize: '13px', fontWeight: '600', transition: 'background 0.2s', cursor: 'pointer' }}>
            <Rocket size={16} style={{ marginRight: '6px', color: 'var(--text-muted)' }} />
            Extras
          </button>
          <button 
            className={showAddForm ? "hover-brightness" : "btn-gold"} 
            onClick={() => {
              if (showAddForm) {
                handleCloseAddForm();
                setIsEditing(false);
              } else {
                setIsEditing(false);
                setNewService({ 
                  name: '', 
                  price: '', 
                  icon: 'Scissors',
                  category: 'Barbería',
                  strategy_type: 'MVP',
                  duration: 30,
                  insumo_cost: 0,
                  variable_cost: 0.50,
                  description: '',
                  included_items: [],
                  is_tattoo: false
                });
                setShowAddForm(true);
              }
            }} 
            style={showAddForm ? { 
              height: '40px', padding: isMobile ? '10px 8px' : '0 20px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: isMobile ? '100%' : 'auto', fontSize: '13px',
              background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', color: '#ff453a', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', fontWeight: '850'
            } : {
              height: '40px', padding: isMobile ? '10px 8px' : '0 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: isMobile ? '100%' : 'auto', fontSize: '13px', fontWeight: '800'
            }}
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Cancelar' : 'Nuevo Servicio'}
          </button>
        </div>
      </div>

      {(showAddForm || isFormExiting) && (
        <div className={isFormExiting ? 'animate-slide-down-fade' : 'animate-slide-up'} style={{ 
          marginBottom: '32px', 
          padding: '32px', 
          borderRadius: '28px', 
          position: 'relative', 
          zIndex: 999,
          overflow: 'visible',
          background: '#e9eae8',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)'
        }}>
          <h3 style={{ marginBottom: '24px', fontSize: '22px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(192, 159, 112, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)' }}>
              {getIconComponent(newService.icon || 'Scissors', 20)}
            </div>
            {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <FieldLabel required>NOMBRE</FieldLabel>
                <input className="form-input glow-input" placeholder="Ej. Limpieza Sonrisa" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} onBlur={() => setNewService({...newService, name: formatServiceName(newService.name)})} style={{ width: '100%', height: '54px', fontSize: '16px', fontWeight: '600' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <FieldLabel required>DURACIÓN (MIN)</FieldLabel>
                <input className="form-input glow-input" type="number" placeholder="45" value={newService.duration === 0 ? '' : newService.duration} onChange={e => setNewService({...newService, duration: e.target.value === '' ? '' : Number(e.target.value)})} style={{ width: '100%', height: '54px', fontSize: '16px', fontWeight: '600', textAlign: 'center' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
              <div style={{ flex: 1 }}>
                <PandaSelect 
                  label="CATEGORÍA"
                  value={newService.category}
                  onChange={val => setNewService({...newService, category: val})}
                  options={categories.map(c => ({ label: c.name, value: c.name }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <PandaSelect 
                  label="ESTRATEGIA"
                  value={newService.strategy_type}
                  onChange={val => setNewService({...newService, strategy_type: val})}
                  options={strategies.map(strat => ({ label: strat.label, value: strat.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <FieldLabel required>PRECIO FINAL ($)</FieldLabel>
              <div className="premium-price-input-container glow-input" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {(newService.category || '').toLowerCase().includes('tatuaj') && (
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)', whiteSpace: 'nowrap', marginRight: '4px' }}>DESDE</span>
                )}
                <span className="price-currency-symbol">$</span>
                <input 
                  className="price-input-field" 
                  type="number" 
                  placeholder="25" 
                  value={newService.price === 0 ? '' : newService.price} 
                  onChange={e => setNewService({...newService, price: e.target.value === '' ? '' : Number(e.target.value)})} 
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '1px' }}>ÍCONO</label>
              <div className="mac-dock-container panda-scrollbar" style={{ padding: '24px 12px 12px 12px', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {AVAILABLE_ICONS.map(ic => (
                  <button
                    key={ic.name}
                    title={ic.label}
                    onClick={() => setNewService({...newService, icon: ic.name})}
                    className={`mac-dock-item ${newService.icon === ic.name ? 'selected' : ''}`}
                  >
                    {getIconComponent(ic.name, 22)}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <FieldLabel>DESCRIPCIÓN</FieldLabel>
              <textarea 
                className="form-input glow-input" 
                placeholder="Beneficios premium del servicio..." 
                value={newService.description || ''} 
                onChange={e => setNewService({...newService, description: e.target.value})} 
                style={{ width: '100%', minHeight: '60px', paddingTop: '16px', resize: 'vertical', fontSize: '14px', lineHeight: '1.6' }} 
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <FieldLabel style={{ color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '900' }}>
                  <LayoutList size={18} /> CHECKLIST / INCLUIDO
                </FieldLabel>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {baseItems.map(item => {
                  const isSelected = newService.included_items?.includes(item.name);
                  return (
                    <button 
                      key={item.id}
                      onClick={() => {
                        const current = newService.included_items || [];
                        const next = isSelected 
                          ? current.filter(i => i !== item.name)
                          : [...current, item.name];
                        setNewService({...newService, included_items: next});
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: isSelected ? '700' : '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: isSelected ? 'rgba(192, 159, 112, 0.15)' : 'rgba(0,0,0,0.3)',
                        border: isSelected ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                        color: isSelected ? 'var(--gold-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-gold" onClick={handleCreateService} style={{ height: '44px', padding: '0 24px', borderRadius: '12px', fontSize: '14px', boxShadow: '0 4px 14px rgba(192, 159, 112, 0.2)' }}>Guardar</button>
            </div>
            
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonGrid items={8} itemHeight={130} minWidth={200} />
      ) : services.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px', borderRadius: '32px' }}>
          <Star size={64} color="rgba(255, 255, 255, 0.1)" style={{ marginBottom: '24px' }} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Tu catálogo está vacío</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Comienza agregando los servicios que definirán tu marca.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {viewMode === 'grid' || isMobile ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
              {services.map(service => {
                if (isMobile) {
                  return (
                    <React.Fragment key={service.id}>
                      <div 
                        className="glass-card" 
                        onClick={() => setSelectedServiceDetail(service)}
                        style={{ 
                          borderRadius: '24px',
                          padding: '20px',
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        {/* Top: Icon + Name & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--gold-primary)' }}>
                              {service.icon ? getIconComponent(service.icon, 20) : getCategoryIcon(service.category, service.name)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '9px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{service.category}</div>
                              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.name}</h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                <Clock size={12} /> {service.duration || 30} min
                              </div>
                            </div>
                          </div>
 
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button 
                              className="action-btn" 
                              onClick={(e) => { e.stopPropagation(); handleEditClick(service); }} 
                              style={{ width: '36px', height: '36px', borderRadius: '10px' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id, service.name); }} 
                              className="action-btn" 
                              style={{ width: '36px', height: '36px', borderRadius: '10px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
 
                        {/* Description */}
                        {service.description && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4', fontStyle: 'italic', borderLeft: '2px solid var(--border-color)', paddingLeft: '10px' }}>
                            {service.description}
                          </p>
                        )}
 
                        {/* Included Checklist Items */}
                        {(service.included_items || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(service.included_items || []).map((item, idx) => (
                              <span key={idx} style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
 
                        {/* Bottom Info: Strategy Tag & Price */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '16px',
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '12px',
                          marginTop: '4px'
                        }}>
                          <div>
                            {service.strategy_type ? (
                              <div style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'var(--bg-tertiary)' }}>
                                {service.strategy_type}
                              </div>
                            ) : <div />}
                          </div>
 
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRECIO</div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'flex-end' }}>
                              <span>${service.price}</span>
                              {rates?.usd > 0 && (
                                <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: '700' }}>
                                  ≈ {Math.round(service.price * rates.usd).toLocaleString()} Bs.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>


                    </React.Fragment>
                  );
                }

                // Desktop / non-mobile card
                return (
                  <React.Fragment key={service.id}>
                    <div className="glass-card premium-hover-card" style={{ 
                      borderRadius: '24px',
                      padding: '24px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-secondary)',
                      backdropFilter: 'blur(12px)'
                    }}>
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)', border: '1px solid rgba(192, 159, 112, 0.2)', boxShadow: '0 4px 12px rgba(192, 159, 112, 0.1)' }}>
                          {service.icon ? getIconComponent(service.icon, 26) : getCategoryIcon(service.category, service.name)}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', opacity: 0.8 }} className="hover-actions-group">
                          <button className="action-btn" onClick={() => handleEditClick(service)} style={{ width: '32px', height: '32px', borderRadius: '10px' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteService(service.id, service.name)} className="action-btn" style={{ width: '32px', height: '32px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)', borderRadius: '10px' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Middle Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{service.category}</div>
                        <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.2' }}>{service.name}</h4>
                        {service.description && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0' }}>{service.description}</p>
                        )}
                      </div>

                      {/* Pills Section */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} /> {service.duration || 30} m
                        </span>
                        {(service.included_items || []).slice(0, 3).map((item, idx) => (
                          <span key={idx} style={{ fontSize: '10px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(192,159,112,0.1)', color: 'var(--gold-primary)', border: '1px solid rgba(192, 159, 112, 0.2)' }}>
                            {item}
                          </span>
                        ))}
                        {(service.included_items?.length > 3) && (
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                            +{service.included_items.length - 3}
                          </span>
                        )}
                      </div>

                      {/* Bottom Price & Strategy */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'flex-end', 
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        paddingTop: '16px',
                        marginTop: '8px'
                      }}>
                        <div>
                          {service.strategy_type && (
                            <div style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {service.strategy_type}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>
                            {(service.category || '').toLowerCase().includes('tatuaj') && <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold-primary)', marginRight: '4px', verticalAlign: 'middle' }}>Desde</span>}
                            ${service.price}
                          </div>
                          {rates?.usd > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>
                              ≈ {Math.round(service.price * rates.usd).toLocaleString()} Bs.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="animate-slide-up" style={{ background: 'var(--bg-secondary)', padding: '0', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Servicio</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoría</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duración</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>{service.name}</div>
                        {service.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.description}</div>}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--gold-primary)', backgroundColor: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '8px' }}>
                          {service.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {service.duration} min
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>
                          {(service.category || '').toLowerCase().includes('tatuaj') && <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--gold-primary)', marginRight: '4px' }}>Desde</span>}
                          ${service.price}
                        </div>
                        {rates?.usd > 0 && <div style={{ fontSize: '11px', color: 'var(--gold-primary)' }}>{Math.round(service.price * rates.usd).toLocaleString()} Bs.</div>}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="action-btn" onClick={() => handleEditClick(service)} style={{ width: '32px', height: '32px' }}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteService(service.id, service.name)} className="action-btn" style={{ width: '32px', height: '32px', color: '#ff453a', backgroundColor: 'rgba(255,69,58,0.1)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Extras Manager Modal */}
      <AnimatedModal isOpen={isExtrasModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))'
          }}>
            <div className={`${cardClass.replace('global-modal-card', '')} glass-card panda-scrollbar`} style={{
              width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
              display: 'flex', flexDirection: 'column', padding: isMobile ? '20px 16px' : '24px',
              borderRadius: '28px', border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px' }}><span className="text-gold">Items</span></h3>
                </div>
                <button 
                  onClick={() => setIsExtrasModalOpen(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', overflowX: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {baseItems.map(item => (
                    <div key={item.id} style={{ 
                      display: 'flex', gap: '8px', alignItems: 'center', 
                      padding: '6px 10px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <input 
                        className="form-input" 
                        value={editingItem?.id === item.id ? editingItem.name : item.name} 
                        onChange={(e) => setEditingItem({ ...(editingItem || item), id: item.id, name: e.target.value })}
                        onFocus={() => setEditingItem(item)}
                        style={{ flex: 1, fontSize: '13px', height: '36px', background: 'transparent', border: 'none', fontWeight: '600', minWidth: 0 }}
                      />

                      
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {editingItem?.id === item.id ? (
                          <>
                            <button onClick={e => handleUpdateMasterItem(item.id, editingItem.name, item.base_cost)} style={{ background: 'transparent', border: 'none', color: '#32d74b', cursor: 'pointer' }}>
                              <Check size={18} />
                            </button>
                            <button onClick={() => setEditingItem(null)} style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer' }}>
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <button onClick={(e) => handleDeleteMasterItem(e, item.id, item.name)} style={{ background: 'transparent', border: 'none', color: '#ff453a', cursor: 'pointer', opacity: 0.7 }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agregar nuevo */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="form-input" 
                    placeholder="Nuevo ítem..." 
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    style={{ flex: 1, height: '40px', fontSize: '13px', minWidth: 0 }}
                  />

                  <button onClick={handleAddMasterChecklistItem} className="btn-gold" style={{ width: '40px', height: '40px', borderRadius: '10px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Billable Extras Management Modal */}
      <AnimatedModal isOpen={isBillableExtrasModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={`${cardClass.replace('global-modal-card', '')} glass-card panda-scrollbar`} style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '20px 16px' : '32px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Rocket size={24} color="var(--gold-primary)" /> Servicios Extras
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Servicios con costo extra que se añaden en caja.</p>
                </div>
                <button onClick={() => setIsBillableExtrasModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="panda-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {billableExtras.map(extra => (
                    <div key={extra.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editingExtra?.id === extra.id ? (
                          <input
                            autoFocus
                            className="form-input"
                            value={editingExtra.name}
                            onChange={e => setEditingExtra(current => ({ ...current, name: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                              if (e.key === 'Escape') setEditingExtra(null);
                            }}
                            placeholder="Nombre del extra"
                            style={{
                              width: '100%',
                              height: '38px',
                              boxSizing: 'border-box',
                              padding: '0 10px',
                              borderRadius: '9px',
                              border: '1px solid var(--gold-primary)',
                              background: 'var(--bg-secondary)',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: '800'
                            }}
                          />
                        ) : (
                          <div style={{ color: 'white', fontSize: '14px', fontWeight: '800', lineHeight: '38px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{extra.name}</div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--gold-primary)', marginTop: '4px', fontWeight: '800' }}>PRECIO EN CAJA</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: '80px' }}>
                          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '800' }}>$</span>
                          <input 
                            className="form-input"
                            type="number"
                            step="0.01"
                            value={editingExtra?.id === extra.id ? editingExtra.price : extra.price}
                            onChange={e => setEditingExtra({ ...(editingExtra || extra), id: extra.id, price: e.target.value })}
                            readOnly={editingExtra?.id !== extra.id}
                            style={{ 
                              height: '36px', 
                              paddingLeft: '22px', 
                              fontSize: '13px', 
                              fontWeight: '800', 
                              textAlign: 'right', 
                              background: editingExtra?.id === extra.id ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)', 
                              border: editingExtra?.id === extra.id ? '1px solid var(--gold-primary)' : '1px solid transparent', 
                              width: '100%',
                              pointerEvents: editingExtra?.id === extra.id ? 'auto' : 'none'
                            }}
                          />
                        </div>
                        
                        {editingExtra?.id === extra.id ? (
                          <button onClick={async () => { const saved = await handleUpdateBillableExtra(extra.id, { name: editingExtra.name, price: Number(editingExtra.price) }); if (saved) setEditingExtra(null); }} className="action-btn" style={{ backgroundColor: '#32d74b', color: 'black', flexShrink: 0 }}>
                            <Check size={16} strokeWidth={3} />
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setEditingExtra({ ...extra, name: String(extra.name || ''), price: String(extra.price ?? '') })} className="action-btn" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', flexShrink: 0 }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={(e) => handleDeleteBillableExtra(e, extra.id, extra.name)} className="action-btn" style={{ backgroundColor: 'rgba(255,69,58,0.1)', color: '#ff453a', flexShrink: 0 }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="extra-add-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>NOMBRE DEL EXTRA</label>
                    <input className="form-input" placeholder="Ej. Mascarilla..." value={newExtraName} onChange={e => setNewExtraName(e.target.value)} style={{ height: '44px', fontSize: '13px', width: '100%' }} />
                  </div>
                  <div style={{ width: '90px', flexShrink: 0 }}>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>PRECIO</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gold-primary)', fontSize: '12px', fontWeight: '800' }}>$</span>
                      <input className="form-input" type="number" step="0.01" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} style={{ height: '44px', paddingLeft: '24px', fontSize: '13px', fontWeight: '800', width: '100%' }} />
                    </div>
                  </div>
                  <button onClick={handleAddBillableExtra} className="btn-gold" style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>
       {/* Details Modal */}
      <AnimatedModal isOpen={!!selectedServiceDetail}>
        {(overlayClass, cardClass) => (
          selectedServiceDetail && (
            <div className={overlayClass.replace('global-modal-overlay', '')} style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 99999, padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))'
            }}>
              <div className={`${cardClass.replace('global-modal-card', '')} glass-card panda-scrollbar`} style={{
                width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
                padding: isMobile ? '20px 16px' : '24px', borderRadius: '28px',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
                position: 'relative'
              }}>
                <button 
                  onClick={() => setSelectedServiceDetail(null)} 
                  style={{ position: 'absolute', right: isMobile ? '32px' : '48px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingRight: '40px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)' }}>
                    {selectedServiceDetail.icon ? getIconComponent(selectedServiceDetail.icon, 20) : getCategoryIcon(selectedServiceDetail.category, selectedServiceDetail.name)}
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedServiceDetail.category}</span>
                    {selectedServiceDetail.strategy_type && (
                      <span style={{ marginLeft: '8px', fontSize: '9px', fontWeight: '900', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--gold-primary)' }}>
                        {selectedServiceDetail.strategy_type}
                      </span>
                    )}
                  </div>
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '16px', paddingRight: '40px' }}>{selectedServiceDetail.name}</h3>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '10px' }}>
                    <Clock size={14} color="var(--gold-primary)" />
                    <strong>Duración:</strong> {selectedServiceDetail.duration || 30} min
                  </div>
                </div>

                {selectedServiceDetail.description && (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Guión de Venta / Descripción</div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: 0, padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', fontStyle: 'italic', border: '1px solid rgba(255,255,255,0.03)' }}>
                      "{selectedServiceDetail.description}"
                    </p>
                  </div>
                )}

                {selectedServiceDetail.included_items && selectedServiceDetail.included_items.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Checklist Incluido ({selectedServiceDetail.included_items.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedServiceDetail.included_items.map((item, idx) => (
                        <span key={idx} style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={12} color="var(--gold-primary)" strokeWidth={3} /> {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="details-price-row">
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio Base</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'white' }}>
                      {(selectedServiceDetail.category || '').toLowerCase().includes('tatuaj') && <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gold-primary)', marginRight: '4px' }}>Desde</span>}
                      ${selectedServiceDetail.price}
                    </div>
                  </div>
                  {rates?.usd > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Precio en Bolívares</div>
                      <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--gold-primary)' }}>
                        {Math.round(selectedServiceDetail.price * rates.usd).toLocaleString()} Bs.
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => {
                      setSelectedServiceDetail(null);
                      handleEditClick(selectedServiceDetail);
                    }} 
                    className="btn-gold"
                    style={{ flex: '1.4', height: '44px', borderRadius: '12px', fontSize: '14px', whiteSpace: 'nowrap' }}
                  >
                    Editar Servicio
                  </button>
                  <button
                    onClick={() => setSelectedServiceDetail(null)}
                    style={{ flex: '1', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', transition: 'background-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </AnimatedModal>

      {/* Modal de Categorías */}
      <AnimatedModal isOpen={isCategoriesModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))'
          }}>
            <div className={`${cardClass.replace('global-modal-card', '')} glass-card panda-scrollbar`} style={{
              width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
              padding: isMobile ? '20px 16px' : '28px', borderRadius: '28px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setIsCategoriesModalOpen(false)} 
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>

              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '40px' }}>
                <Settings size={20} color="var(--gold-primary)" /> Categorías
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>Agrega o elimina las categorías disponibles para clasificar tus servicios.</p>

              {/* Agregar Categoría */}
              <div style={{ marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  {editingCategory ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA'}
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input 
                    className="form-input" 
                    placeholder="Ej. Manicura, Masajes" 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)} 
                    style={{ height: '44px', flex: 1 }} 
                  />
                  {editingCategory && (
                    <button 
                      onClick={handleCancelEditCategory} 
                      className="btn-gold" 
                      style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      type="button"
                    >
                      <X size={20} />
                    </button>
                  )}
                  <button 
                    onClick={handleSaveCategory} 
                    className="btn-gold" 
                    style={{ height: '44px', width: '44px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    {editingCategory ? <Check size={20} /> : <Plus size={24} />}
                  </button>
                </div>


              </div>

              {/* Listado de Categorías */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map((catObj, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ color: 'var(--gold-primary)' }}>
                        {getIconComponent(catObj.icon || getFallbackIconName(catObj.name), 20)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{catObj.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleEditCategoryClick(catObj)} 
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(catObj)} 
                        style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>


            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Modal de Estrategias */}
      <AnimatedModal isOpen={isStrategiesModalOpen}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: isMobile ? '12px' : '20px', paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 12px))' : 'max(20px, env(safe-area-inset-top, 20px))'
          }}>
            <div className={`${cardClass.replace('global-modal-card', '')} glass-card panda-scrollbar`} style={{
              width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
              padding: isMobile ? '20px 16px' : '28px', borderRadius: '28px',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.6)',
              position: 'relative'
            }}>
              <button 
                onClick={() => setIsStrategiesModalOpen(false)} 
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>

              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '40px' }}>
                <Crown size={20} color="var(--gold-primary)" /> Estrategias de Venta
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '20px' }}>Configura los tipos de estrategias de venta cruzada y retención para tus servicios.</p>

              {/* Agregar Estrategia */}
              <div style={{ marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="strategy-add-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>VALOR CLAVE</label>
                    <input 
                      className="form-input" 
                      placeholder="Ej. VIP, Promo" 
                      value={newStrategyValue} 
                      onChange={e => setNewStrategyValue(e.target.value)} 
                      style={{ height: '44px', width: '100%' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>ETIQUETA VISIBLE</label>
                    <input 
                      className="form-input" 
                      placeholder="Ej. Servicio VIP Dientes Sanos" 
                      value={newStrategyLabel} 
                      onChange={e => setNewStrategyLabel(e.target.value)} 
                      style={{ height: '44px', width: '100%' }} 
                    />
                  </div>
                </div>
                <button 
                  onClick={handleAddStrategy} 
                  className="btn-gold" 
                  style={{ height: '44px', width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Plus size={18} /> Agregar Estrategia
                </button>
              </div>

              {/* Listado de Estrategias */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {strategies.map((strat, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{strat.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '900' }}>VALOR: {strat.value}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteStrategy(strat.value)} 
                      style={{ background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>


            </div>
          </div>
        )}
      </AnimatedModal>

    </div>
  );
};

export default ServicesModule;
