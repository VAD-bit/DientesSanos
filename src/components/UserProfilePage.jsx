import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Clock, 
  Star, 
  Wrench, 
  Plus, 
  Trash2, 
  TrendingUp,
  Sparkles,
  Shield,
  Activity,
  Package,
  Calendar,
  DollarSign,
  Smartphone,
  Tag,
  Key,
  ChevronDown,
  Target,
  Pencil,
  Check,
  X,
  History,
  Minus,
  BadgeDollarSign,
  WalletCards,
  Camera,
  Loader2,
  Cake,
  PartyPopper,
  Balloon
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { supabase } from '../lib/supabase';
import { useNotifs } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import PersonalInventoryHistoryModal from './PersonalInventoryHistoryModal';
import PasskeySettings from './PasskeySettings';
import { SkeletonGrid, SkeletonList } from './Skeleton';

const asArray = (value) => Array.isArray(value) ? value : [];

const isBirthdayToday = (birthDate) => {
  if (!birthDate) return false;
  const parts = String(birthDate).split('-');
  if (parts.length < 3) return false;
  const today = new Date();
  return Number(parts[1]) === today.getMonth() + 1 && Number(parts[2]) === today.getDate();
};

// Vista previa temporal: activa el banner de cumpleaños con ?previewBday=1 en la URL.
// Sirve para revisar el diseño sin tener que iniciar sesion con otra cuenta. Quitar cuando ya no se use.
const isBirthdayPreview = () => {
  try {
    return new URLSearchParams(window.location.search).get('previewBday') === '1';
  } catch {
    return false;
  }
};

// Conteo animado 0 -> valor (easeOutCubic). Da la sensacion "viva" tipo Apple en los KPIs.
const useCountUp = (target, duration = 950) => {
  const numericTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      setValue(numericTarget);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(numericTarget * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numericTarget, duration]);
  return value;
};

const KpiNum = ({ target, format }) => {
  const value = useCountUp(target);
  return <>{format(value)}</>;
};

const UserProfilePage = ({ staffMember, inventory = [], onUpdate, isMobile }) => {
  const { user } = useAuth();
  const { showToast, triggerConfetti } = useNotifs();
  const { confirm } = useDialog();
  const isCelebratingBirthday = isBirthdayToday(staffMember?.birth_date) || isBirthdayPreview();

  const birthdayConfetti = useMemo(() => {
    if (!isCelebratingBirthday) return [];
    const colors = ['#111111', '#fff2cd', '#ffffff', '#a67c1e'];
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      size: Math.random() * 7 + 4,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 2.5 + 2.5,
      delay: Math.random() * 3,
    }));
  }, [isCelebratingBirthday]);

  const birthdayFloaters = useMemo(() => {
    if (!isCelebratingBirthday) return [];
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      kind: Math.random() > 0.5 ? 'sparkle' : 'balloon',
      left: Math.random() * 90,
      duration: Math.random() * 3 + 4,
      delay: Math.random() * 4,
    }));
  }, [isCelebratingBirthday]);

  useEffect(() => {
    if (!isCelebratingBirthday || !staffMember?.id) return;
    const flagKey = `panda_birthday_confetti_${staffMember.id}_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(flagKey)) return;
    localStorage.setItem(flagKey, '1');
    const timer = setTimeout(() => triggerConfetti?.(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCelebratingBirthday, staffMember?.id]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalServiceComm: 0,
    totalProductComm: 0,
    totalTips: 0,
    topServices: [],
    avgDurationMin: 0
  });
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({ servicesCount: 0, income: 0 });
  const [settlement, setSettlement] = useState(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [isPaymentHistoryExiting, setIsPaymentHistoryExiting] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ income: '', services: '' });

  // Inventory/Tools State
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
  const handleClosePaymentHistory = () => {
    setIsPaymentHistoryExiting(true);
    setTimeout(() => {
      setShowPaymentHistory(false);
      setIsPaymentHistoryExiting(false);
    }, 250);
  };
  const handleCloseToolForm = () => {
    setIsToolFormExiting(true);
    setTimeout(() => {
      setShowAddTool(false);
      setIsToolFormExiting(false);
    }, 250);
  };
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showInventoryHistory, setShowInventoryHistory] = useState(false);
  const [adjustingToolId, setAdjustingToolId] = useState(null);

  // Portfolio State
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const MAX_PORTFOLIO = 5;

  const loadPortfolio = async () => {
    if (!staffMember?.id) return;
    setPortfolioLoading(true);
    try {
      const { data } = await supabase
        .from('staff_portfolio')
        .select('*')
        .eq('staff_id', staffMember.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setPortfolio(data || []);
    } catch (e) {
      console.error('Portfolio load error:', e);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const addPortfolioPhoto = async (file) => {
    if (!file || !staffMember?.id) return;
    if (portfolio.length >= MAX_PORTFOLIO) {
      showToast(`Máximo ${MAX_PORTFOLIO} fotos por portafolio.`, 'error');
      return;
    }
    setPortfolioUploading(true);
    let uploadedStoragePath = null;
    try {
      showToast('Comprimiendo imagen...');
      const compressedFile = await compressImage(file, 800, 0.7);
      const path = `${staffMember.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, compressedFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      uploadedStoragePath = path;
      const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path);
      const { data, error: dbError } = await supabase
        .from('staff_portfolio')
        .insert([{ staff_id: staffMember.id, image_url: publicUrl, storage_path: path }])
        .select()
        .single();
      if (dbError) throw dbError;
      uploadedStoragePath = null;
      setPortfolio(prev => [data, ...prev]);
      showToast('Foto agregada al portafolio.');
    } catch (e) {
      if (uploadedStoragePath) {
        const { error: cleanupError } = await supabase.storage.from('portfolio').remove([uploadedStoragePath]);
        if (cleanupError) console.error('Portfolio storage rollback error:', cleanupError);
      }
      console.error('Portfolio upload error:', e);
      showToast('Error al subir la foto.', 'error');
    } finally {
      setPortfolioUploading(false);
    }
  };

  const removePortfolioPhoto = async (photo) => {
    try {
      if (photo.storage_path) {
        await supabase.storage.from('portfolio').remove([photo.storage_path]);
      }
      await supabase.from('staff_portfolio').delete().eq('id', photo.id);
      setPortfolio(prev => prev.filter(p => p.id !== photo.id));
      showToast('Foto eliminada.');
    } catch (e) {
      console.error('Portfolio remove error:', e);
      showToast('Error al eliminar.', 'error');
    }
  };

  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', quality);
      };
      img.src = url;
    });
  };

  useEffect(() => {
    if (staffMember?.id) loadPortfolio();
  }, [staffMember?.id]);

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
    if (staffMember?.id) {
      loadProfileData();
      setTools(asArray(staffMember.tools));
    }
    // Depende solo del id: el padre recrea el objeto staffMember en cada render,
    // y usar el objeto completo disparaba recargas constantes del perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffMember?.id]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileStats, today, staffSettlement] = await Promise.all([
        dataService.getStaffProfileStats(staffMember.id),
        dataService.getTodayAppointments(),
        dataService.getStaffSettlement(staffMember.id)
      ]);
      setStats(profileStats);
      setSettlement(staffSettlement);

      const assistantRole = (staffMember.role || '').toLowerCase();
      const assistant = assistantRole.includes('asistente') || assistantRole.includes('lavado');
      setTodayAppointments(asArray(today).filter(appointment => (
        assistant
          ? asArray(appointment.appointment_staff).some(entry => String(entry.staff_id) === String(staffMember.id))
          : String(appointment.staff_id) === String(staffMember.id)
      )));

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthRecords = asArray(profileStats.rawRecords).filter(record => {
        const appointment = record.appointments;
        const date = new Date(appointment?.scheduled_at || appointment?.created_at || 0);
        return appointment && date >= monthStart;
      });
      setMonthlyStats({
        servicesCount: monthRecords.length,
        income: monthRecords.reduce((sum, record) => (
          sum
          + Number(record.commission_earned || 0)
          + Number(record.product_commission || 0)
        ), 0)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      showToast('Error cargando métricas del perfil', 'error');
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
      showToast('Artículo registrado con éxito');
      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing profile data:', refreshError);
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
        ? 'Artículo removido y devuelto al inventario general'
        : 'Artículo removido del perfil');
      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing profile data:', refreshError);
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
      showToast(amount < 0 ? `Registrado: gastaste 1 ${tool.name}` : `Se repuso 1 ${tool.name}`);

      if (onUpdate) {
        try {
          await onUpdate();
        } catch (refreshError) {
          console.error('Error refreshing profile data:', refreshError);
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

  // Parse Role & Permissions
  const roleRaw = staffMember?.role || 'ASISTENTE';
  const roleName = roleRaw.includes('|') ? roleRaw.split('|')[0] : roleRaw;
  const rawPermissions = roleRaw.includes('|') ? roleRaw.split('|')[1].split(',') : [];
  const isAssistant = roleName.toLowerCase().includes('asistente') || roleName.toLowerCase().includes('lavado');
  const goalStoragePrefix = `panda_profile_goal_${staffMember?.id}`;
  const monthlyGoalIncome = Number(localStorage.getItem(`${goalStoragePrefix}_income`) || (isAssistant ? 100 : 400));
  const monthlyGoalServices = Number(localStorage.getItem(`${goalStoragePrefix}_services`) || (isAssistant ? 50 : 40));
  const incomeProgress = Math.min(100, Math.round((monthlyStats.income / Math.max(1, monthlyGoalIncome)) * 100));
  const serviceProgress = Math.min(100, Math.round((monthlyStats.servicesCount / Math.max(1, monthlyGoalServices)) * 100));
  const completedToday = todayAppointments.filter(appointment => appointment.status === 'Completado').length;
  const todayIncome = asArray(stats.rawRecords).reduce((sum, record) => {
    const appointment = record.appointments;
    const date = new Date(appointment?.scheduled_at || appointment?.created_at || 0);
    const now = new Date();
    if (date.toDateString() !== now.toDateString()) return sum;
    return sum + Number(record.commission_earned || 0) + Number(record.product_commission || 0);
  }, 0);

  const openGoalEditor = () => {
    setGoalDraft({ income: String(monthlyGoalIncome), services: String(monthlyGoalServices) });
    setEditingGoals(true);
  };

  const saveGoals = () => {
    const income = Number(goalDraft.income);
    const services = Number(goalDraft.services);
    if (income > 0) localStorage.setItem(`${goalStoragePrefix}_income`, String(income));
    if (services > 0) localStorage.setItem(`${goalStoragePrefix}_services`, String(services));
    setEditingGoals(false);
    showToast('Metas actualizadas');
  };

  const formatTime = (value) => value
    ? new Date(value).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '--:--';

  const translatePermission = (perm) => {
    const mapping = {
      'DASHBOARD': 'Panel Principal',
      'SCHEDULING': 'Agenda',
      'RECEPTION': 'Recepción',
      'CHECKOUT': 'Caja Chica',
      'BARBER': 'Panel Odontólogo',
      'CLIENTS': 'Pacientes',
      'PERSONNEL': 'Equipo de Personal',
      'SERVICES': 'Servicios',
      'INVENTORY': 'Inventario',
      'FINANCE': 'Reportes y Métricas',
      'HISTORY': 'Historial de Operaciones'
    };
    return mapping[perm.toUpperCase()] || perm;
  };

  if (!staffMember) {
    return (
      <div style={{ padding: '32px' }}>
        <SkeletonList rows={3} rowHeight={60} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in barber-command-center" style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1380px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Premium UI Styles injection */}
      <style>{`
        .premium-profile-card {
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 255, 255, 0.03);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .premium-profile-card:hover {
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 255, 255, 0.08);
        }
        .glow-avatar-border {
          position: relative;
          background: linear-gradient(135deg, var(--gold-primary) 0%, #a67c1e 100%);
          padding: 4px;
          border-radius: 50%;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 255, 255, 0.3);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .glow-avatar-border:hover {
          transform: scale(1.05) rotate(5deg);
        }
        .permission-badge-tag {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 4px 10px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .permission-badge-tag:hover {
          background-color: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
          color: var(--gold-primary);
          transform: translateY(-2px);
        }
        .stat-glow-card {
          padding: 24px;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .stat-glow-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(255, 255, 255, 0.05);
        }
        .stat-indicator-bar {
          width: 50px;
          height: 3px;
          margin-top: 16px;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .stat-glow-card:hover .stat-indicator-bar {
          width: 80px;
        }
        .rank-row {
          background-color: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          padding: 10px 14px;
          transition: all 0.2s ease;
        }
        .rank-row:hover {
          background-color: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateX(4px);
        }
        .custom-form-input {
          height: 40px;
          padding: 0 14px;
          font-size: 13px;
          border-radius: 10px;
          background-color: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: white;
          width: 100%;
          outline: none;
          transition: all 0.2s ease;
        }
        .custom-form-input:focus {
          border-color: var(--gold-primary);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
          background-color: rgba(0, 0, 0, 0.5);
        }
        .inventory-tool-row {
          padding: 12px 16px;
          background-color: rgba(0,0,0,0.15);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }
        .inventory-tool-row:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background-color: rgba(255, 255, 255, 0.02);
          transform: translateY(-1px);
        }
        .animated-aurora {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(42, 34, 15, 0.8) 50%, rgba(20, 20, 20, 0.95) 100%);
          background-size: 200% 200%;
          animation: auroraBg 15s ease infinite;
        }
        @keyframes auroraBg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(28px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideRightFade {
          0% { opacity: 0; transform: translateX(-24px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.85); }
          70% { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1); }
        }
        .anim-0 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.05s; }
        .anim-1 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.15s; }
        .anim-2 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.25s; }
        .anim-3 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.35s; }
        .anim-4 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.45s; }
        .anim-5 { animation: slideUpFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.55s; }
        .anim-pop { animation: popIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: 0.1s; }
        .profile-hero { order: 0; }
        .profile-kpis { order: 1; }
        .profile-agenda-grid { order: 2; }
        .profile-portfolio { order: 3; }
        .profile-finance-grid { order: 4; }
        .profile-payroll { order: 5; }
        .profile-detail-grid { order: 6; }
        /* ===== KPI suite (Apple-style): dato heroe + tiles ===== */
        .kpi-suite { order: 1; display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.7fr); gap: 12px; }
        .kpi-hero {
          position: relative; overflow: hidden;
          border-radius: 24px; padding: 22px 24px; min-height: 156px;
          display: flex; flex-direction: column; justify-content: center;
          background:
            radial-gradient(circle at 82% 12%, rgba(255,242,205,.28), transparent 55%),
            linear-gradient(140deg, rgba(17, 17, 17,.24) 0%, rgba(166,124,30,.12) 55%, rgba(20,17,11,.5) 100%);
          border: 1px solid rgba(17, 17, 17,.30);
          box-shadow: 0 18px 42px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07);
        }
        .kpi-hero-shine {
          position: absolute; inset: -50% -50%; pointer-events: none;
          background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.10) 50%, transparent 58%);
          animation: bdaySweep 4.5s ease-in-out infinite;
        }
        .kpi-hero-top { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .kpi-hero-icon {
          width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; color: #1a1408;
          background: linear-gradient(135deg, #fff2cd, var(--gold-primary));
          box-shadow: 0 6px 16px rgba(17, 17, 17,.4);
        }
        .kpi-hero-chip {
          font-size: 10px; font-weight: 850; letter-spacing: .5px; text-transform: uppercase; color: #f2e2c4;
          background: rgba(0,0,0,.30); border: 1px solid rgba(17, 17, 17,.3);
          padding: 6px 11px; border-radius: 999px; white-space: nowrap;
        }
        .kpi-hero-value {
          position: relative; z-index: 1; margin-top: 16px;
          font-family: Outfit, var(--font-sans), system-ui; font-size: 46px; font-weight: 950;
          letter-spacing: -1.6px; line-height: 1; font-variant-numeric: tabular-nums;
          background: linear-gradient(90deg, #fff7e6, #111111 72%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .kpi-hero-label { position: relative; z-index: 1; margin-top: 9px; font-size: 11px; font-weight: 800; letter-spacing: .9px; text-transform: uppercase; color: rgba(255,255,255,.5); }
        .kpi-tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .kpi-tile {
          position: relative; overflow: hidden; border-radius: 20px; padding: 18px 16px;
          background: linear-gradient(160deg, rgba(255,255,255,.05), rgba(255,255,255,.015));
          border: 1px solid rgba(255,255,255,.06);
          transition: transform .28s cubic-bezier(.22,1,.36,1), border-color .28s ease, box-shadow .28s ease;
        }
        .kpi-tile-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; opacity: .9; }
        .kpi-tile:hover { transform: translateY(-4px); border-color: rgba(255,255,255,.16); box-shadow: 0 14px 30px rgba(0,0,0,.42); }
        .kpi-tile-icon { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; border: 1px solid transparent; margin-bottom: 14px; }
        .kpi-tile-value { font-family: Outfit, var(--font-sans), system-ui; font-size: 26px; font-weight: 950; color: #fff; letter-spacing: -.5px; line-height: 1; font-variant-numeric: tabular-nums; }
        .kpi-unit { font-size: 13px; font-weight: 800; color: rgba(255,255,255,.4); margin-left: 4px; }
        .kpi-tile-label { margin-top: 8px; font-size: 10px; font-weight: 800; letter-spacing: .6px; text-transform: uppercase; color: rgba(255,255,255,.42); }
        /* ===== Ganancias (finanzas) Apple-style, dorado de marca ===== */
        .fin-card {
          position: relative; overflow: hidden; border-radius: 20px; padding: 20px 18px;
          background: linear-gradient(160deg, rgba(17, 17, 17,.06), rgba(255,255,255,.012));
          border: 1px solid rgba(255,255,255,.06);
          transition: transform .28s cubic-bezier(.22,1,.36,1), border-color .28s ease, box-shadow .28s ease;
        }
        .fin-card:hover { transform: translateY(-4px); border-color: rgba(17, 17, 17,.28); box-shadow: 0 16px 34px rgba(0,0,0,.45); }
        .fin-card-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--gold-primary); opacity: .85; }
        .fin-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
        .fin-card-icon { width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: var(--gold-primary); background: rgba(17, 17, 17,.13); border: 1px solid rgba(17, 17, 17,.26); }
        .fin-card-pill { font-size: 9px; font-weight: 850; letter-spacing: .5px; text-transform: uppercase; color: #e7d3ad; background: rgba(17, 17, 17,.10); border: 1px solid rgba(17, 17, 17,.25); padding: 4px 8px; border-radius: 999px; white-space: nowrap; }
        .fin-card-label { font-size: 10.5px; font-weight: 850; letter-spacing: .6px; text-transform: uppercase; color: rgba(255,255,255,.45); }
        .fin-card-value { margin-top: 8px; font-family: Outfit, var(--font-sans), system-ui; font-size: 30px; font-weight: 950; color: #fff; letter-spacing: -.8px; line-height: 1; font-variant-numeric: tabular-nums; }
        .fin-card-sub { margin-top: 7px; font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,.32); }
        @media (max-width: 720px) {
          .fin-card { padding: 16px 14px; }
          .fin-card-value { font-size: 26px; }
        }
        @media (max-width: 900px) {
          .kpi-suite { grid-template-columns: 1fr; }
        }
        @media (max-width: 720px) {
          .kpi-hero { min-height: 0; padding: 20px; }
          .kpi-hero-value { font-size: 40px; }
          .kpi-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        .profile-hero-banner { height: 104px !important; }
        .profile-hero-content { margin-top: -52px !important; padding: 18px 26px 24px !important; align-items: center !important; }
        .profile-avatar-shell > div:first-child { width: 92px !important; height: 92px !important; }
        .profile-command-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }
        .profile-sync-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid rgba(48, 209, 88, 0.2);
          background: rgba(48, 209, 88, 0.07);
          color: #72e28b;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.45px;
          text-transform: uppercase;
        }
        .profile-quick-button {
          min-height: 36px;
          padding: 0 13px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.82);
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: 180ms ease;
        }
        .profile-quick-button:hover {
          color: #111;
          background: var(--gold-primary);
          border-color: var(--gold-primary);
          transform: translateY(-1px);
        }
        .profile-kpis > div { min-width: 0; }
        .profile-finance-grid .stat-glow-card { padding: 18px !important; border-radius: 20px !important; }
        .profile-portfolio-grid {
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px !important;
          align-items: stretch !important;
        }
        .profile-portfolio-item,
        .profile-portfolio-upload {
          width: 100% !important;
          height: auto !important;
          aspect-ratio: 4 / 3;
          border-radius: 16px !important;
        }
        .profile-portfolio-item img { transition: transform 300ms ease, filter 300ms ease; }
        .profile-portfolio-item:hover img { transform: scale(1.045); filter: brightness(0.82); }
        .profile-portfolio-item button {
          width: 30px !important;
          height: 30px !important;
          top: 8px !important;
          right: 8px !important;
          box-shadow: 0 6px 18px rgba(0,0,0,0.38);
        }
        .profile-portfolio-upload svg { width: 24px; height: 24px; }
        .profile-portfolio-upload span { font-size: 10px !important; letter-spacing: 0.7px; }
        .profile-empty-state {
          grid-column: 1 / -1;
          padding: 28px;
          border: 1px dashed rgba(255,255,255,0.09);
          border-radius: 16px;
          text-align: center;
        }
        @media (max-width: 1100px) {
          .barber-command-center { max-width: 100% !important; }
          .profile-hero-content { align-items: flex-end !important; }
          .profile-command-meta { justify-content: flex-start; margin-top: 14px; }
          .profile-agenda-grid { grid-template-columns: minmax(0, 1.45fr) minmax(280px, 1fr) !important; }
          .profile-detail-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .profile-portfolio-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
          .barber-command-center { gap: 14px !important; padding-bottom: 84px !important; }
          .profile-hero { border-radius: 22px !important; }
          .profile-hero-banner { height: 82px !important; }
          .profile-hero-content { margin-top: -38px !important; padding: 14px 16px 18px !important; align-items: center !important; gap: 12px !important; }
          .profile-avatar-shell > div:first-child { width: 78px !important; height: 78px !important; }
          .profile-command-meta { justify-content: center; width: 100%; }
          .profile-sync-pill { width: 100%; justify-content: center; }
          .profile-quick-button { flex: 1; justify-content: center; }
          .profile-kpis {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .profile-kpis > div {
            min-width: 0 !important;
            border-right: 1px solid rgba(255,255,255,0.05) !important;
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
          }
          .profile-kpis > div:nth-child(2n) { border-right: none !important; }
          .profile-kpis > div:nth-child(5) { grid-column: 1 / -1; border-right: none !important; }
          .profile-kpis > div:last-child { border-bottom: none !important; }
          .profile-agenda-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .profile-finance-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .profile-finance-grid .stat-glow-card { min-width: 0 !important; }
          .profile-portfolio-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }
          .profile-portfolio-item,
          .profile-portfolio-upload { min-width: 0 !important; aspect-ratio: 4 / 3; }
          .profile-empty-state { min-width: 0 !important; grid-column: 1 / -1; }
          .profile-payroll { padding: 18px !important; }
        }
        /* ===== Cumpleaños: hero fusionado en una sola tarjeta ===== */
        .profile-hero--bday {
          background:
            radial-gradient(circle at 26% -15%, rgba(17, 17, 17,.32), transparent 55%),
            radial-gradient(circle at 90% 130%, rgba(17, 17, 17,.20), transparent 52%),
            linear-gradient(160deg, #17140d 0%, #0a0906 100%) !important;
          border: 1px solid rgba(17, 17, 17,.42) !important;
          box-shadow: 0 30px 70px rgba(0,0,0,.6), 0 0 60px rgba(17, 17, 17,.14) !important;
        }
        .bday-shine {
          position: absolute; inset: -50% -50%; z-index: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.12) 50%, transparent 60%);
          animation: bdaySweep 3.5s ease-in-out infinite;
        }
        @keyframes bdaySweep {
          0% { transform: translateX(-30%); }
          50% { transform: translateX(30%); }
          100% { transform: translateX(-30%); }
        }
        .bday-confetti-layer, .bday-float-layer { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .bday-confetti { position: absolute; top: -10px; border-radius: 2px; animation: bdayFall linear infinite; opacity: .9; }
        @keyframes bdayFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(260px) rotate(340deg); opacity: 0; }
        }
        .bday-floater { position: absolute; bottom: -50px; opacity: .82; animation: bdayRise linear infinite; color: var(--gold-primary); }
        @keyframes bdayRise {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          12% { opacity: .85; }
          100% { transform: translateY(-280px) translateX(10px) rotate(22deg); opacity: 0; }
        }
        .profile-avatar-shell.is-bday {
          background: conic-gradient(from 0deg, #111111, #fff2cd, #111111, #a67c1e, #111111) !important;
          animation: bdaySpin 5s linear infinite;
          box-shadow: 0 0 26px rgba(17, 17, 17,.55), 0 0 55px rgba(17, 17, 17,.22) !important;
        }
        .profile-avatar-shell.is-bday > div:first-child { animation: bdayCounterspin 5s linear infinite; }
        /* La foto es protagonista en cumpleaños: avatar mas grande que en el perfil normal */
        .profile-hero--bday .profile-avatar-shell { padding: 5px !important; }
        .profile-hero--bday .profile-avatar-shell > div:first-child { width: 128px !important; height: 128px !important; }
        @keyframes bdaySpin { to { transform: rotate(360deg); } }
        @keyframes bdayCounterspin { to { transform: rotate(-360deg); } }
        .bday-corner-badge {
          position: absolute; top: 16px; right: 18px; z-index: 2;
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(17, 17, 17,.16); border: 1px solid rgba(17, 17, 17,.42);
          color: #f2e2c4; font-size: 10px; font-weight: 900; letter-spacing: 1.4px;
          padding: 6px 13px; border-radius: 999px; text-transform: uppercase;
        }
        .bday-inline-title {
          font-size: 32px; font-weight: 950; letter-spacing: -0.8px; line-height: 1.12; margin: 0 0 8px;
          display: inline-flex; align-items: center; gap: 10px;
          font-family: Outfit, var(--font-sans), system-ui;
        }
        .bday-inline-title .bday-cake-icon { color: #111111; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(17, 17, 17,.6)); }
        .bday-inline-title .bday-title-text {
          background: linear-gradient(90deg, #fff2cd, #111111 55%, #fff2cd);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          text-shadow: 0 0 40px rgba(17, 17, 17,.35);
        }
        .bday-inline-sub { margin: 12px 0 0; color: rgba(255,255,255,.62); font-size: 13px; line-height: 1.45; max-width: 430px; }
        @media (max-width: 720px) {
          /* En movil: stack centrado y ordenado (badge arriba centrado, pastel sobre el titulo) */
          .bday-inline-title {
            font-size: 23px; line-height: 1.16;
            flex-direction: column; gap: 8px; justify-content: center;
            margin: 2px 0 14px;
          }
          .bday-inline-title .bday-cake-icon { filter: drop-shadow(0 0 10px rgba(17, 17, 17,.7)); }
          .bday-inline-sub { margin: 16px auto 0; font-size: 12.5px; max-width: 300px; }
          .bday-corner-badge { top: 14px; right: auto; left: 50%; transform: translateX(-50%); }
          .profile-hero--bday .profile-avatar-shell > div:first-child { width: 112px !important; height: 112px !important; }
        }
      `}</style>

      {/* 1. Header Banner & Profile Info Card (se vuelve festivo en cumpleaños) */}
      <div className={`glass-card premium-profile-card anim-0 profile-hero${isCelebratingBirthday ? ' profile-hero--bday' : ''}`} style={{
        padding: '0',
        borderRadius: '32px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {isCelebratingBirthday && (
          <>
            <div className="bday-shine" />
            <div className="bday-float-layer">
              {birthdayFloaters.map(f => (
                <div
                  key={f.id}
                  className="bday-floater"
                  style={{ left: `${f.left}%`, animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s` }}
                >
                  {f.kind === 'sparkle' ? <Sparkles size={18} /> : <Balloon size={18} />}
                </div>
              ))}
            </div>
            <div className="bday-confetti-layer">
              {birthdayConfetti.map(c => (
                <div
                  key={c.id}
                  className="bday-confetti"
                  style={{
                    width: c.size, height: c.size, left: `${c.left}%`, background: c.color,
                    animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s`
                  }}
                />
              ))}
            </div>
            <div className="bday-corner-badge"><PartyPopper size={13} /> día especial</div>
          </>
        )}
        {/* Banner con aurora dorada (se apaga en cumpleaños para dejar ver el fondo festivo) */}
        <div className="profile-hero-banner" style={{ height: '150px', position: 'relative', overflow: 'hidden' }}>
          {!isCelebratingBirthday && <div className="animated-aurora" />}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.2) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />
        </div>

        {/* Profile Card Overlay Content */}
        <div className="profile-hero-content" style={{
          padding: '24px 32px 32px 32px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: '28px',
          marginTop: '-75px'
        }}>

          {/* Glowing Avatar - Perfectly Rounded & flex-shrink: 0 */}
          <div className={`glow-avatar-border profile-avatar-shell${isCelebratingBirthday ? ' is-bday' : ''}`} style={{ flexShrink: 0 }}>
            <div style={{ 
              width: '110px', 
              height: '110px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {staffMember?.image_url ? (
                <img src={staffMember.image_url} alt={staffMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '46px', fontWeight: '950', color: 'white', fontFamily: 'Outfit, var(--font-sans), system-ui', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
                  {staffMember?.name ? staffMember.name.charAt(0) : 'A'}
                </div>
              )}
            </div>
            {/* Status dot in the corner of the avatar */}
            <div style={{ 
              position: 'absolute', 
              bottom: '4px', 
              right: '4px', 
              width: '18px', 
              height: '18px', 
              borderRadius: '50%', 
              backgroundColor: '#30d158', 
              border: '3px solid #161616',
              boxShadow: '0 0 10px rgba(48,209,88,0.5)'
            }} />
          </div>

          {/* User Details */}
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', width: '100%' }}>
            
            {/* Top row alignment */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'center', gap: '18px' }}>
              <div>
                {isCelebratingBirthday ? (
                  <h2 className="bday-inline-title">
                    <Cake size={28} className="bday-cake-icon" />
                    <span className="bday-title-text">¡Feliz cumpleaños, {String(staffMember.name || '').trim().split(' ')[0]}!</span>
                  </h2>
                ) : (
                  <h2 style={{ fontSize: '32px', fontWeight: '950', color: 'white', letterSpacing: '-0.8px', marginBottom: '8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>
                    {staffMember.name}
                  </h2>
                )}

                {/* Styled Clean Badge for Role and Credentials info */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start', alignItems: 'center' }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: '900', 
                    color: '#121212', 
                    backgroundColor: 'var(--gold-primary)', 
                    padding: '5px 12px', 
                    borderRadius: '20px', 
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(255, 255, 255, 0.3)'
                  }}>
                    <Shield size={12} /> {roleName}
                  </span>
                  
                  {staffMember.id_card && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontWeight: '700', 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Tag size={10} /> ID: {staffMember.id_card}
                    </span>
                  )}
                  
                  {staffMember.phone && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: 'rgba(255, 255, 255, 0.5)', 
                      fontWeight: '700', 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Smartphone size={10} /> {staffMember.phone}
                    </span>
                  )}
                </div>
                {isCelebratingBirthday && (
                  <p className="bday-inline-sub">Hoy todo el equipo de Dientes Sanos brinda por ti. Que este nuevo año venga cargado de cosas increíbles.</p>
                )}
              </div>
              <div className="profile-command-meta">
                <span className="profile-sync-pill"><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#30d158', boxShadow: '0 0 10px rgba(48,209,88,.65)' }} /> Perfil público sincronizado</span>
                <button type="button" className="profile-quick-button" onClick={() => document.getElementById('profile-agenda')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                  <Calendar size={14} /> Ver agenda
                </button>
                <button type="button" className="profile-quick-button" onClick={() => document.getElementById('profile-portfolio')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                  <Camera size={14} /> Subir fotos
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <PasskeySettings showToast={showToast} />

      {/* 2. Key Performance Metrics Grid */}
      {loading ? (
        <SkeletonGrid items={4} itemHeight={110} minWidth={200} />
      ) : (
        <>
          <div className="kpi-suite anim-1">
            {/* Dato heroe: la ganancia de hoy, protagonista */}
            <div className="kpi-hero">
              <div className="kpi-hero-shine" />
              <div className="kpi-hero-top">
                <div className="kpi-hero-icon"><BadgeDollarSign size={20} strokeWidth={2.2} /></div>
                <span className="kpi-hero-chip">{completedToday} {isAssistant ? 'limpiezas' : 'servicios'} hoy</span>
              </div>
              <div className="kpi-hero-value">
                <KpiNum target={todayIncome} format={(n) => `$${n.toFixed(2)}`} />
              </div>
              <div className="kpi-hero-label">{isAssistant ? 'Ingresos de hoy' : 'Ganancia de hoy'}</div>
            </div>

            {/* Metricas de apoyo */}
            <div className="kpi-tiles">
              {[
                { icon: Star, accent: '#111111', label: isAssistant ? 'Limpiezas hoy' : 'Servicios hoy', target: completedToday, format: (n) => String(Math.round(n)) },
                { icon: Calendar, accent: '#111111', label: 'Este mes', target: monthlyStats.servicesCount, format: (n) => String(Math.round(n)) },
                { icon: TrendingUp, accent: '#111111', label: 'Ganancia mes', target: monthlyStats.income, format: (n) => `$${n.toFixed(2)}` },
                { icon: Clock, accent: '#111111', label: 'Tiempo prom.', target: stats.avgDurationMin, unit: 'min', format: (n) => String(Math.round(n)) }
              ].map((tile) => {
                const TileIcon = tile.icon;
                return (
                  <div key={tile.label} className="kpi-tile">
                    <span className="kpi-tile-bar" style={{ background: tile.accent }} />
                    <div className="kpi-tile-icon" style={{ color: tile.accent, background: `${tile.accent}22`, borderColor: `${tile.accent}44` }}>
                      <TileIcon size={16} strokeWidth={2.3} />
                    </div>
                    <div className="kpi-tile-value">
                      <KpiNum target={tile.target} format={tile.format} />
                      {tile.unit && <span className="kpi-unit">{tile.unit}</span>}
                    </div>
                    <div className="kpi-tile-label">{tile.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isAssistant && (
            <div className="glass-card anim-1 profile-payroll" style={{ padding: isMobile ? 18 : 20, borderRadius: 20, border: '1px solid rgba(17, 17, 17,.18)', background: 'linear-gradient(135deg, rgba(17, 17, 17,.09), rgba(255,255,255,.02))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--gold-primary)', fontSize: 11, fontWeight: 900, letterSpacing: .8, textTransform: 'uppercase' }}>Historial de pagos</span>
                  <h3 style={{ margin: '6px 0 3px', fontSize: isMobile ? 22 : 27, color: 'white' }}>Pagos y vales de nómina</h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Consulta cada pago, abono o adelanto registrado.</span>
                </div>
                <button type="button" onClick={() => showPaymentHistory ? handleClosePaymentHistory() : setShowPaymentHistory(true)} className="btn-gold" style={{ padding: '12px 18px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}><History size={17} /> {showPaymentHistory ? 'Ocultar historial' : 'Ver historial'}</button>
              </div>
              {(showPaymentHistory || isPaymentHistoryExiting) && (
                <div className={isPaymentHistoryExiting ? 'animate-slide-down-fade' : 'animate-fade-in'} style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.08)', display: 'grid', gap: 8 }}>
                  {asArray(settlement?.paymentHistory).length === 0 ? <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Aún no hay pagos ni vales registrados.</div> : asArray(settlement?.paymentHistory).map(item => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '120px minmax(0, 1fr) 150px auto', gap: 10, alignItems: 'center', padding: isMobile ? '12px' : '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,.035)' }}>
                      <div><span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11 }}>{new Date(item.date).toLocaleDateString('es-VE')}</span>{isMobile && <span style={{ display: 'block', marginTop: 3, color: 'var(--text-secondary)', fontSize: 10 }}>{item.paymentMethod}</span>}</div>
                      {isMobile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 5 }}>
                          <strong style={{ color: ['Adelanto', 'Consumo'].includes(item.type) ? '#ff9f0a' : '#30d158', fontSize: 11 }}>{item.type}</strong>
                          {item.type === 'Consumo' && item.items?.length > 0 && <span style={{ maxWidth: 150, color: 'var(--text-secondary)', fontSize: 9, textAlign: 'right' }}>{item.items.map(product => `${product.quantity}x ${product.name}`).join(', ')}</span>}
                          <strong style={{ color: ['Adelanto', 'Consumo'].includes(item.type) ? '#ff9f0a' : 'white', fontSize: 14, lineHeight: 1.15 }}>{['Adelanto', 'Consumo'].includes(item.type) ? '-' : '+'}{Number(item.amountBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</strong>
                        </div>
                      ) : (
                        <>
                          <div><strong style={{ display: 'block', color: ['Adelanto', 'Consumo'].includes(item.type) ? '#ff9f0a' : '#30d158', fontSize: 12 }}>{item.type}</strong>{item.type === 'Consumo' && item.items?.length > 0 && <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{item.items.map(product => `${product.quantity}x ${product.name}`).join(', ')}</span>}</div>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{item.paymentMethod}</span>
                          <strong style={{ textAlign: 'right', color: ['Adelanto', 'Consumo'].includes(item.type) ? '#ff9f0a' : 'white' }}>{['Adelanto', 'Consumo'].includes(item.type) ? '-' : '+'}{Number(item.amountBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</strong>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))', gap: '12px' }} className="anim-1 profile-finance-grid">
            {[
              { icon: BadgeDollarSign, label: isAssistant ? 'Ingresos por limpiezas' : 'Comisión servicios', amount: stats.totalServiceComm },
              { icon: Package, label: 'Comisión productos', amount: stats.totalProductComm },
              { icon: TrendingUp, label: 'Total propinas', amount: stats.totalTips },
              { icon: WalletCards, label: 'Vales este mes', amount: Number(settlement?.valesMonthBs || 0) / Math.max(1, Number(settlement?.rate || 1)), bs: Number(settlement?.valesMonthBs || 0), pill: 'Por descontar' }
            ].map((card, i) => {
              const CardIcon = card.icon;
              const bsValue = card.bs != null ? card.bs : card.amount * Number(settlement?.rate || 0);
              return (
                <div key={card.label} className={`fin-card anim-${Math.min(4, i + 2)}`}>
                  <span className="fin-card-bar" />
                  <div className="fin-card-top">
                    <div className="fin-card-icon"><CardIcon size={18} strokeWidth={2.2} /></div>
                    {card.pill && <span className="fin-card-pill">{card.pill}</span>}
                  </div>
                  <div className="fin-card-label">{card.label}</div>
                  <div className="fin-card-value"><KpiNum target={card.amount} format={(n) => `$${n.toFixed(2)}`} /></div>
                  <div className="fin-card-sub">{bsValue.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</div>
                </div>
              );
            })}
          </div>

          {/* PORTFOLIO SECTION */}
          <div id="profile-portfolio" className="glass-card anim-2 profile-portfolio" style={{ borderRadius: '22px', border: '1px solid rgba(255,255,255,0.06)', padding: isMobile ? '18px' : '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>Portafolio de Trabajos</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Tus mejores trabajos para que los clientes los vean</p>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{portfolio.length}/{MAX_PORTFOLIO}</span>
            </div>
            {portfolioLoading ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                {[1,2,3].map(i => <div key={i} style={{ width: '80px', height: '80px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : (
              <div className="profile-portfolio-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {portfolio.map(photo => (
                  <div className="profile-portfolio-item" key={photo.id} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={() => removePortfolioPhoto(photo)}
                      style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,69,58,0.9)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {portfolio.length < MAX_PORTFOLIO && (
                  <label className="profile-portfolio-upload" style={{ width: '80px', height: '80px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: portfolioUploading ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.02)', gap: '6px', opacity: portfolioUploading ? 0.5 : 1, transition: 'all 0.2s' }}>
                    {portfolioUploading
                      ? <Loader2 size={18} color="var(--gold-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                      : <><Camera size={16} color="var(--gold-primary)" /><span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800' }}>SUBIR</span></>
                    }
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={portfolioUploading} onChange={e => { const f = e.target.files?.[0]; if (f) addPortfolioPhoto(f); e.target.value = ''; }} />
                  </label>
                )}
                {portfolio.length === 0 && !portfolioUploading && (
                  <span className="profile-empty-state" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sube hasta 5 fotos de tus mejores trabajos</span>
                )}
              </div>
            )}
          </div>

          <div id="profile-agenda" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr minmax(0, 1fr)', gap: '16px' }} className="anim-3 profile-agenda-grid">
            <div className="glass-card" style={{ padding: isMobile ? '20px' : '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <Calendar size={17} color="var(--gold-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {isAssistant ? 'Servicios asignados hoy' : 'Agenda de hoy'}
                  </h4>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{completedToday}/{todayAppointments.length} completados</span>
              </div>

              {todayAppointments.length === 0 ? (
                <div style={{ padding: '30px 18px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '14px' }}>
                  {isAssistant ? 'No tienes servicios asignados para hoy' : 'No tienes citas agendadas para hoy'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {todayAppointments.map(appointment => {
                    const active = appointment.status === 'En Silla';
                    const completed = appointment.status === 'Completado';
                    return (
                      <div key={appointment.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: active ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.025)', border: active ? '1px solid rgba(17, 17, 17,0.22)' : '1px solid rgba(255,255,255,0.035)' }}>
                        <span style={{ width: '62px', flexShrink: 0, color: active ? 'var(--gold-primary)' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700' }}>{formatTime(appointment.scheduled_at || appointment.created_at)}</span>
                        <span style={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', background: completed ? '#30d158' : active ? 'var(--gold-primary)' : '#555' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'white', fontSize: '13px', fontWeight: '750', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appointment.clients?.name || 'Cliente'}</div>
                          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{appointment.services?.name || 'Servicio'}</div>
                        </div>
                        <span style={{ flexShrink: 0, padding: '4px 9px', borderRadius: '20px', color: completed ? '#30d158' : active ? 'var(--gold-primary)' : '#888', background: completed ? 'rgba(48,209,88,0.1)' : active ? 'rgba(17, 17, 17,0.1)' : 'rgba(255,255,255,0.05)', fontSize: '10px', fontWeight: '800' }}>{appointment.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: isMobile ? '20px' : '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <Target size={17} color="var(--gold-primary)" />
                  <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Metas del mes</h4>
                </div>
                {!editingGoals ? (
                  <button onClick={openGoalEditor} style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#999', borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center', fontSize: '10px', fontWeight: '800' }}><Pencil size={10} /> Editar</button>
                ) : (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={saveGoals} style={{ border: '1px solid rgba(17, 17, 17,0.3)', background: 'rgba(17, 17, 17,0.12)', color: 'var(--gold-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}><Check size={11} /></button>
                    <button onClick={() => setEditingGoals(false)} style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#888', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer' }}><X size={11} /></button>
                  </div>
                )}
              </div>

              {editingGoals ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ color: '#888', fontSize: '10px', fontWeight: '800' }}>META {isAssistant ? 'LIMPIEZAS' : 'SERVICIOS'}<input className="custom-form-input" type="number" value={goalDraft.services} onChange={event => setGoalDraft(current => ({ ...current, services: event.target.value }))} style={{ marginTop: '6px' }} /></label>
                  <label style={{ color: '#888', fontSize: '10px', fontWeight: '800' }}>META INGRESOS (USD)<input className="custom-form-input" type="number" value={goalDraft.income} onChange={event => setGoalDraft(current => ({ ...current, income: event.target.value }))} style={{ marginTop: '6px' }} /></label>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { label: isAssistant ? 'Limpiezas' : 'Servicios', value: `${monthlyStats.servicesCount} / ${monthlyGoalServices}`, progress: serviceProgress, color: 'var(--gold-primary)' },
                    { label: 'Ingresos', value: `$${monthlyStats.income.toFixed(2)} / $${monthlyGoalIncome.toFixed(2)}`, progress: incomeProgress, color: '#30d158' }
                  ].map(goal => (
                    <div key={goal.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#aaa', fontSize: '12px' }}><span>{goal.label}</span><strong style={{ color: 'white' }}>{goal.value}</strong></div>
                      <div style={{ height: 6, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', width: `${goal.progress}%`, background: goal.color, borderRadius: 6 }} /></div>
                      <div style={{ marginTop: '5px', textAlign: 'right', color: goal.progress >= 100 ? goal.color : '#555', fontSize: '10px' }}>{goal.progress >= 100 ? '¡Meta alcanzada!' : `${goal.progress}% completado`}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Double Column Detail Section */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', gap: '18px' }} className="profile-detail-grid">
            
            {/* Left Column: Historial & Rendimiento */}
            <div className="glass-card anim-4" style={{ borderRadius: '28px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={18} color="var(--gold-primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rendimiento Histórico</h4>
              </div>

              {/* Service & Time Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                    <Star size={12} color="var(--gold-primary)" /> {isAssistant ? 'LIMPIEZAS' : 'SERVICIOS'}
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '950', color: 'white', marginTop: '8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>{stats.totalAppointments}</div>
                </div>
                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                    <Clock size={12} color="var(--gold-primary)" /> TIEMPO PROMEDIO
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '950', color: 'white', marginTop: '8px', fontFamily: 'Outfit, var(--font-sans), system-ui' }}>
                    {stats.avgDurationMin} <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: '800' }}>min</span>
                  </div>
                </div>
              </div>

              {/* Top Services ranking list */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{isAssistant ? 'Limpiezas más realizadas' : 'Servicios más realizados'}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stats.topServices.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>No hay registros de servicios aún</div>
                  ) : (
                    stats.topServices.map((srv, idx) => (
                      <div key={idx} className="rank-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ fontWeight: '750', color: 'white' }}>{srv.service_name}</span>
                          <span style={{ fontWeight: '900', color: 'var(--gold-primary)', backgroundColor: 'rgba(255, 255, 255,0.08)', border: '1px solid rgba(255, 255, 255,0.15)', padding: '3px 8px', borderRadius: '8px', fontSize: '10px' }}>{srv.count} veces</span>
                        </div>
                        <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${Math.min(100, (srv.count / Math.max(1, stats.totalAppointments)) * 100)}%`, 
                            height: '100%', 
                            background: 'var(--gold-gradient)',
                            boxShadow: 'var(--gold-glow)'
                          }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Herramientas e Inventario */}
            <div className="glass-card anim-5" style={{ borderRadius: '28px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', border: '1px solid rgba(255,255,255,0.04)' }}>
              
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '14px' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench size={18} color="var(--gold-primary)" style={{ flexShrink: 0 }} />
                  <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inventario Personal</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                <button
                  onClick={() => setShowInventoryHistory(true)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    padding: '9px 11px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    flex: isMobile ? 1 : undefined
                  }}
                >
                  <History size={12} /> Historial
                </button>
                <button
                  onClick={() => showAddTool ? handleCloseToolForm() : setShowAddTool(true)}
                  style={{
                    backgroundColor: showAddTool ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.1)',
                    border: showAddTool ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '10px',
                    color: showAddTool ? 'white' : 'var(--gold-primary)',
                    padding: '9px 14px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    flex: isMobile ? 1 : undefined,
                    transition: 'background-color 0.2s ease, color 0.2s ease'
                  }}
                >
                  <Plus size={12} /> {showAddTool ? 'Cerrar' : 'Asignar'}
                </button>
                </div>
              </div>

              {/* Add Tool Form */}
              {(showAddTool || isToolFormExiting) && (
                <div className={isToolFormExiting ? 'animate-scale-out' : 'animate-scale-in'} style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255,0.2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['Herramienta', 'Producto'].map(itemType => (
                        <button
                          key={itemType}
                          type="button"
                          onClick={() => setNewTool({
                            ...newTool,
                            item_type: itemType,
                            inventory_id: '',
                            status: itemType === 'Producto' ? 'Disponible' : 'Operativa'
                          })}
                          style={{
                            flex: 1,
                            height: '34px',
                            borderRadius: '8px',
                            border: newTool.item_type === itemType ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: newTool.item_type === itemType ? 'rgba(17, 17, 17,0.16)' : 'rgba(255,255,255,0.04)',
                            color: newTool.item_type === itemType ? 'var(--gold-primary)' : 'rgba(255,255,255,0.65)',
                            fontSize: '11px',
                            fontWeight: '900',
                            cursor: 'pointer'
                          }}
                        >
                          {itemType}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => setNewTool({ ...newTool, ownership: 'Propia', inventory_id: '' })}
                        style={{ 
                          flex: 1, 
                          height: '34px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          backgroundColor: newTool.ownership === 'Propia' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', 
                          color: newTool.ownership === 'Propia' ? 'black' : 'white', 
                          fontSize: '11px', 
                          fontWeight: '900', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Propia
                      </button>
                      <button 
                        onClick={() => setNewTool({ ...newTool, ownership: 'Asignada', inventory_id: '' })}
                        style={{ 
                          flex: 1, 
                          height: '34px', 
                          borderRadius: '8px', 
                          border: 'none', 
                          backgroundColor: newTool.ownership === 'Asignada' ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)', 
                          color: newTool.ownership === 'Asignada' ? 'black' : 'white', 
                          fontSize: '11px', 
                          fontWeight: '900', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Asignada del Stock
                      </button>
                    </div>

                    {newTool.ownership === 'Propia' ? (
                      <>
                        <input 
                          type="text" 
                          placeholder={newTool.item_type === 'Producto' ? 'Nombre (Ej: Laca profesional)' : 'Nombre (Ej: Clipper Magic Clip)'}
                          value={newTool.name}
                          onChange={e => setNewTool({ ...newTool, name: e.target.value })}
                          className="custom-form-input"
                        />
                        <input 
                          type="text" 
                          placeholder={newTool.item_type === 'Producto' ? 'Marca/Detalles (opcional)' : 'Marca/Modelo (opcional)'}
                          value={newTool.brand}
                          onChange={e => setNewTool({ ...newTool, brand: e.target.value })}
                          className="custom-form-input"
                        />
                      </>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        {/* Custom Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="custom-form-input"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            background: 'var(--bg-secondary)',
                            border: dropdownOpen ? '1px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: dropdownOpen ? '0 0 10px rgba(255, 255, 255, 0.2)' : 'none',
                            transition: 'box-shadow 0.2s ease'
                          }}
                        >
                          <span style={{ color: newTool.inventory_id ? 'white' : 'rgba(255, 255, 255, 0.4)' }}>
                            {newTool.inventory_id 
                              ? `${availableInventoryTools.find(t => t.id === newTool.inventory_id)?.name} · Stock: ${availableInventoryTools.find(t => t.id === newTool.inventory_id)?.stock}`
                              : `Selecciona ${newTool.item_type === 'Producto' ? 'un producto' : 'una herramienta'}...`}
                          </span>
                          <ChevronDown size={16} color="var(--gold-primary)" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                        </button>

                        {/* Custom Dropdown Floating Panel */}
                        {dropdownOpen && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '6px',
                            background: 'var(--bg-secondary)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            zIndex: 100
                          }}>
                            {availableInventoryTools.length === 0 ? (
                              <div style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', textAlign: 'center' }}>
                                No hay {newTool.item_type.toLowerCase()}s disponibles en stock
                              </div>
                            ) : (
                              availableInventoryTools.map(t => (
                                <div
                                  key={t.id}
                                  onClick={() => {
                                    setNewTool({ ...newTool, inventory_id: t.id });
                                    setDropdownOpen(false);
                                  }}
                                  style={{
                                    padding: '10px 14px',
                                    color: newTool.inventory_id === t.id ? 'var(--gold-primary)' : 'white',
                                    backgroundColor: newTool.inventory_id === t.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    transition: 'all 0.15s ease',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.color = 'var(--gold-primary)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = newTool.inventory_id === t.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
                                    e.currentTarget.style.color = newTool.inventory_id === t.id ? 'var(--gold-primary)' : 'white';
                                  }}
                                >
                                  {t.name} · Stock: {t.stock}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: '800', minWidth: '70px' }}>
                        CANTIDAD
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={newTool.ownership === 'Asignada'
                          ? availableInventoryTools.find(item => item.id === newTool.inventory_id)?.stock
                          : undefined}
                        value={newTool.quantity}
                        onChange={event => setNewTool({ ...newTool, quantity: event.target.value })}
                        className="custom-form-input"
                        style={{ width: '110px' }}
                      />
                    </div>

                    <button 
                      onClick={handleAddTool}
                      className="btn-gold" 
                      style={{ 
                        height: '42px', 
                        borderRadius: '10px', 
                        fontSize: '12px', 
                        fontWeight: '900', 
                        marginTop: '4px',
                        boxShadow: '0 5px 15px rgba(255, 255, 255, 0.25)' 
                      }}
                    >
                      CONFIRMAR ASIGNACIÓN
                    </button>
                  </div>
                </div>
              )}

              {/* Tools List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {tools.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px' }}>
                    Ningún artículo registrado en este perfil.
                  </div>
                ) : (
                  tools.map(tool => {
                    const itemType = tool.item_type || 'Herramienta';
                    const resolvedStatus = tool.status || (itemType === 'Producto' ? 'Disponible' : 'Operativa');
                    const isHealthy = ['Operativa', 'Disponible'].includes(resolvedStatus);
                    return (
                    <div 
                      key={tool.id} 
                      className="inventory-tool-row"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {itemType === 'Producto'
                          ? <Package size={16} color="var(--gold-primary)" />
                          : <Wrench size={16} color="var(--gold-primary)" />}
                        <div>
                        <div style={{ fontWeight: '800', fontSize: '13px', color: 'white' }}>
                          {tool.name} <span style={{ color: 'var(--gold-primary)', fontSize: '11px' }}>× {tool.quantity || 1}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                          {itemType}{tool.brand ? ` · ${tool.brand}` : ''} · <span style={{ color: tool.ownership === 'Propia' ? 'var(--gold-primary)' : '#30d158', fontWeight: '800' }}>{tool.ownership}</span>
                        </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {itemType === 'Producto' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <button
                              onClick={() => handleAdjustPersonalProduct(tool.id, -1)}
                              disabled={adjustingToolId === tool.id || Number(tool.quantity || 0) <= 0}
                              title="Registrar que gastaste una unidad"
                              style={{
                                height: '29px',
                                padding: '0 9px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,159,10,0.25)',
                                background: 'rgba(255,159,10,0.1)',
                                color: '#ffb340',
                                fontSize: '10px',
                                fontWeight: '900',
                                cursor: Number(tool.quantity || 0) > 0 ? 'pointer' : 'not-allowed',
                                opacity: Number(tool.quantity || 0) > 0 ? 1 : 0.45,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Minus size={11} /> Gasté 1
                            </button>
                            <button
                              onClick={() => handleAdjustPersonalProduct(tool.id, 1)}
                              disabled={adjustingToolId === tool.id}
                              title="Reponer una unidad"
                              style={{
                                width: '29px',
                                height: '29px',
                                borderRadius: '8px',
                                border: '1px solid rgba(48,209,88,0.22)',
                                background: 'rgba(48,209,88,0.1)',
                                color: '#30d158',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center'
                              }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: '900', 
                          color: isHealthy ? '#30d158' : '#ff453a',
                          backgroundColor: isHealthy ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                          border: isHealthy ? '1px solid rgba(48,209,88,0.2)' : '1px solid rgba(255,69,58,0.2)',
                          padding: '3px 8px', 
                          borderRadius: '6px' 
                        }}>
                          {resolvedStatus.toUpperCase()}
                        </span>
                        <button 
                          onClick={() => handleRemoveTool(tool.id)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'rgba(255, 69, 58, 0.7)', 
                            cursor: 'pointer', 
                            padding: '6px', 
                            display: 'flex', 
                            alignItems: 'center',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            backgroundColor: 'rgba(255, 69, 58, 0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ff453a';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 69, 58, 0.7)';
                            e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.05)';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
          <PersonalInventoryHistoryModal
            isOpen={showInventoryHistory}
            onClose={() => setShowInventoryHistory(false)}
            staffId={staffMember.id}
          />
        </>
      )}

    </div>
  );
};

export default UserProfilePage;
