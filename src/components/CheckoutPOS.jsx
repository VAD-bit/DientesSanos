import React, { useState, useEffect, useRef, useMemo } from 'react';
import useDebounce from '../hooks/useDebounce';
import FieldLabel from './FieldLabel';
import { createPortal } from 'react-dom';
import goldChairImg from '../assets/gold_chair.webp';
import { 
  Wallet, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  RefreshCcw, 
  Plus, 
  Minus, 
  CheckCircle,
  CreditCard,
  History,
  TrendingUp,
  User,
  Scissors,
  Zap,
  Droplets,
  Edit3,
  XCircle,
  Sparkles,
  Flame,
  Eye,
  RefreshCw,
  Wind,
  PenTool,
  BarChart3
} from 'lucide-react';
import { 
  GiNoseFront, GiBeard, GiComb, GiHairStrands, GiWaterDrop, 
  GiCoffeeCup, GiBeerBottle, GiSpray, 
  GiShower, GiBottleVapors, GiTowel
} from 'react-icons/gi';
import { FaChild } from 'react-icons/fa';
import { MdWorkspacePremium, MdFace3 } from 'react-icons/md';
import { TbEar } from 'react-icons/tb';

import { dataService } from '../services/dataService';
import { SkeletonList } from './Skeleton';
import { useNotifs } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';
import PandaSelect from './PandaSelect';
import { notificationService } from '../services/notificationService';
import { whatsappService } from '../services/whatsappService';
import PandaDatePicker from './PandaDatePicker';
import PandaDialog from './PandaDialog';
import NewClientModal from './NewClientModal';
import { UserPlus, ChevronDown, VenetianMask, Ear, ScanFace, ShowerHead, Waves } from 'lucide-react';
import { Link2, AlertTriangle, Bell, Gift, Printer, Check } from 'lucide-react';
import { ModalShield, useModal } from '../context/ModalContext';
import AnimatedModal from './AnimatedModal';
import SellableInventoryModal from './SellableInventoryModal';
import { normalizeForSearch } from '../utils/stringUtils';
import { useScrollLock } from '../hooks/useScrollLock';
import ReceiptTicket from './ReceiptTicket';
import { enqueuePayment, subscribeToQueue, initOfflineService, listPendingPayments, discardPayment, retryQueueNow } from '../services/offlineService';
import { filterSellableInventory, getInventorySalesLabel, INVENTORY_SALES_GROUPS, matchesInventorySalesGroup } from '../utils/inventorySales';

const parseUsdAmount = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '')
    .trim()
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 1;
};

// No real service costs under $1 — if a Bs-labeled price input converts to
// less than that, the cashier almost certainly typed the USD amount into the
// Bs field by mistake. Catch it before it silently corrupts total_price.
const MIN_PLAUSIBLE_SERVICE_USD = 1;

const formatUsdAmount = (value) => parseUsdAmount(value).toLocaleString('es-VE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const DEFAULT_WASHING_RATE_USD = 1;
const WASH_ASSISTANT_SHARE = 0.60;
const getWashingRate = (staffMember) => {
  const configuredRate = Number(staffMember?.washing_rate || 0);
  return configuredRate > 0 ? configuredRate : DEFAULT_WASHING_RATE_USD;
};

// Un extra cuyo nombre contiene "lavado" (Lavado express, Lavado premium, etc.) es trabajo
// de la asistente de lavado, no del barbero. Su comisión va a la asistente al 60% fijo.
const isAssistantRole = (role) => {
  const r = (role || '').toLowerCase();
  return r.includes('asist') || r.includes('lavado');
};
// Si en el sistema hay UNA sola asistente activa, todos los lavados son de ella.
const getSoleAssistantId = (staffList) => {
  const assistants = (staffList || []).filter(s => isAssistantRole(s.role) && s.active !== false);
  return assistants.length === 1 ? assistants[0].id : '';
};
const isWashExtraName = (name) => (name || '').toLowerCase().includes('lavado');

const CartSellerSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={containerRef} style={{ position: 'relative', marginLeft: '8px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          color: 'var(--gold-primary)',
          fontSize: '11px',
          fontWeight: '800',
          borderRadius: '10px',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          whiteSpace: 'nowrap',
          minWidth: '105px',
          transition: 'all 0.2s',
          boxShadow: isOpen ? '0 0 0 2px rgba(255, 255, 255,0.2)' : 'none'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          {selected?.imageUrl && <img src={selected.imageUrl} alt="" style={{ width: '20px', height: '20px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected ? selected.label : '+ Vendedor'}</span>
        </span>
        <ChevronDown size={14} strokeWidth={3} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          zIndex: 9999,
          minWidth: '120px',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div 
            onClick={() => { onChange(''); setIsOpen(false); }}
            style={{ padding: '10px 14px', fontSize: '11px', color: !value ? 'var(--gold-primary)' : 'white', cursor: 'pointer', background: !value ? 'rgba(255, 255, 255,0.1)' : 'transparent', fontWeight: !value ? '800' : '500', transition: '0.2s' }}
            onMouseEnter={e => { if(value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if(value) e.currentTarget.style.background = 'transparent' }}
          >
            + Vendedor
          </div>
          {options.map(opt => (
            <div 
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: value === opt.value ? 'var(--gold-primary)' : 'white', cursor: 'pointer', background: value === opt.value ? 'rgba(255, 255, 255,0.1)' : 'transparent', fontWeight: value === opt.value ? '800' : '500', transition: '0.2s' }}
              onMouseEnter={e => { if(value !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if(value !== opt.value) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ width: '26px', height: '26px', flexShrink: 0, overflow: 'hidden', display: 'grid', placeItems: 'center', borderRadius: '9px', border: '1px solid rgba(17, 17, 17,.22)', background: 'rgba(17, 17, 17,.1)', color: 'var(--gold-primary)', fontSize: '9px', fontWeight: 900 }}>
                {opt.imageUrl ? <img src={opt.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (opt.avatarFallback || '?')}
              </span>
              <span style={{ display: 'flex', minWidth: 0, flexDirection: 'column' }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</strong>
                {opt.subtitle && <small style={{ color: 'rgba(255,255,255,.4)', fontSize: '8px' }}>{opt.subtitle}</small>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PortaledDropdown = ({ isOpen, onClose, triggerRef, children, menuStyle }) => {
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });

  React.useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99998 }} />
      <div className="animate-scale-in" style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: Math.max(pos.width, 200),
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(30px)',
        border: '1.5px solid rgba(255, 255, 255, 0.25)',
        borderRadius: '14px',
        overflowY: 'auto',
        maxHeight: '220px',
        zIndex: 99999,
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.7)',
        ...menuStyle
      }}>
        {children}
      </div>
    </>,
    document.body
  );
};

const calculateCouponDiscount = (coupon, apps, washes, wRate) => {
  if (!coupon || !coupon.prize_name) return 0;
  
  const sPrice = apps.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0);

  const name = coupon.prize_name.toUpperCase();
  
  if (name.includes('% DESCUENTO')) {
    const match = name.match(/(\d+)%/);
    if (match) {
       return sPrice * (parseInt(match[1]) / 100);
    }
  }
  
  if (name.startsWith('PREMIO:')) {
    const target = name.replace('PREMIO:', '').trim();
    if (target.includes('CORTE')) {
      const corteApp = apps.find(a => a.services?.name?.toUpperCase().includes('CORTE'));
      return corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0;
    } else if (target.includes('LAVADO')) {
      return washes * (wRate || 1);
    } else if (target.includes('BARBA') || target.includes('CEJAS')) {
      const extraApp = apps.find(a => a.services?.name?.toUpperCase().includes(target));
      return extraApp ? (extraApp.total_price || extraApp.services?.price || 0) : 0;
    } else {
      return 0; 
    }
  }

  // Fallback
  if (name.includes('10%')) return sPrice * 0.1;
  if (name.includes('CORTE')) {
    const corteApp = apps.find(a => a.services?.name?.toUpperCase().includes('CORTE'));
    return corteApp ? (corteApp.total_price || corteApp.services?.price || 0) : 0;
  }
  if (name.includes('LAVADO')) return washes * (wRate || 1);
  return 5;
};

const CartWrapper = ({ isMobile, showMobileCart, onClose, isModalView, children }) => {
  const [shouldRender, setShouldRender] = useState(showMobileCart);
  const [isExiting, setIsExiting] = useState(false);

  useScrollLock(isMobile && shouldRender);

  useEffect(() => {
    if (showMobileCart) {
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showMobileCart, shouldRender]);

  if (isMobile && !shouldRender) return null;

  if (isMobile) {
    const modalContent = (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'flex-end', animation: isExiting ? 'fadeOut 0.3s forwards' : 'fadeIn 0.2s' }}>
        <div style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
        <div style={{ width: '100%', maxHeight: '90vh', background: 'var(--bg-secondary)', borderRadius: '24px 24px 0 0', position: 'relative', animation: isExiting ? 'slideDownFadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column' }}>
          {/* Header Fijo */}
          <div style={{ padding: '16px 16px 10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
            {/* Drag Handle (Apple Style) */}
            <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 12px auto' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900' }}>Carrito</h3>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '6px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>
          </div>
          {/* Contenido Scrolleable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '120px' }}>
            {children}
          </div>
        </div>
      </div>
    );
    return createPortal(modalContent, document.body);
  }
  return <section style={isModalView ? { width: '100%' } : {}}>{children}</section>;
};

const CheckoutPOS = ({ isMobile, rates, onNavigate, preselectAppId, isModalView, onClose }) => {
  const { showToast, triggerConfetti, triggerRocket } = useNotifs();
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  const [pendingServices, setPendingServices] = useState([]);
  const [printTransaction, setPrintTransaction] = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [allExtras, setAllExtras] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirmServiceBarberRef = useRef(false);
  
  // Selection State
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDirectSale, setIsDirectSale] = useState(false);
  const [idSearch, setIdSearch] = useState('');
  const [directSaleIdSearch, setDirectSaleIdSearch] = useState('');
  const [directSaleSearchResults, setDirectSaleSearchResults] = useState([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const { isModalOpen } = useModal();
  
  // Checkout Multi-State
  const [fixedRate, setFixedRate] = useState(() => rates?.usd ? Number(Number(rates.usd).toFixed(2)) : 0);

  useEffect(() => {
    if (rates?.usd) {
      setFixedRate(Number(Number(rates.usd).toFixed(2)));
    }
  }, [rates]);
  const [tips, setTips] = useState([]); // Array of { id, staffId, amount }
  const [cart, setCart] = useState([]); // Sold products
  const [itemSalesAssociations, setItemSalesAssociations] = useState({}); // { itemId: staffId }
  const [paymentMode, setPaymentMode] = useState('full_bs'); // or 'mixed'
  const [settlementType, setSettlementType] = useState('paid'); // paid | receivable | courtesy | exchange
  const [exchangeStaffId, setExchangeStaffId] = useState('');
  const [cashUsd, setCashUsd] = useState(0);
  const [methodUsd, setMethodUsd] = useState('Efectivo');
  const [methodBs, setMethodBs] = useState('Pago Móvil');
  const [paymentReferenceBs, setPaymentReferenceBs] = useState('');
  const [selectedWasherId, setSelectedWasherId] = useState('');
  const [isWasherDropdownOpen, setIsWasherDropdownOpen] = useState(false);
  const washerTriggerRef = React.useRef(null);
  const [openTipDropdownId, setOpenTipDropdownId] = useState(null);
  const tipTriggerRefs = React.useRef({});
  const [washCount, setWashCount] = useState(0);
  const userSetWashCountRef = useRef(false);
  const [bundledApps, setBundledApps] = useState([]);
  const [linkedApps, setLinkedApps] = useState([]);
  const [totalAppsInCheckout, setTotalAppsInCheckout] = useState([]);
  const [activeAppForBarberChange, setActiveAppForBarberChange] = useState(null);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineItems, setOfflineItems] = useState([]);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);

  useScrollLock(!!printTransaction || !!previewReceipt);

  // Opens the "pending offline payments" modal, loading the current queue contents.
  const openOfflineModal = async () => {
    try { setOfflineItems(await listPendingPayments()); } catch { setOfflineItems([]); }
    setShowOfflineModal(true);
  };
  const refreshOfflineItems = async () => {
    try { setOfflineItems(await listPendingPayments()); } catch { setOfflineItems([]); }
  };
  const handleRetryOffline = async () => {
    setOfflineBusy(true);
    try { await retryQueueNow(); showToast('Reintentando sincronizar…'); } catch { /* noop */ }
    await refreshOfflineItems();
    setOfflineBusy(false);
  };
  const handleDiscardOffline = (id) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Descartar pago pendiente',
      message: 'Este pago no se enviará al servidor y no se podrá recuperar. ¿Descartar de todas formas?',
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        setOfflineBusy(true);
        try { await discardPayment(id); showToast('Pago pendiente descartado'); } catch { /* noop */ }
        await refreshOfflineItems();
        setOfflineBusy(false);
      }
    });
  };

  // Coupon & Reminder States
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [clientCoupons, setClientCoupons] = useState([]);
  const [reminderPreset, setReminderPreset] = useState('14_days');
  const [reminderDate, setReminderDate] = useState(null);

  // Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [selectedServiceForBarber, setSelectedServiceForBarber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedProductSearch = useDebounce(searchTerm, 300);
  const [productGroup, setProductGroup] = useState('all');

  // Dialog State
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const [editingExtraPriceId, setEditingExtraPriceId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isChangingBarber, setIsChangingBarber] = useState(false);
  const [editingAppPrice, setEditingAppPrice] = useState(null);
  const [newAppPriceVal, setNewAppPriceVal] = useState('');

  const handleUpdateExtraPrice = async (extraId, newPriceBs) => {
    try {
      setLoading(true);
      const priceBs = parseFloat(newPriceBs) || 0;
      const priceUsd = fixedRate > 0 ? (priceBs / fixedRate) : 0;
      await dataService.updateAppointmentExtraPrice(extraId, priceUsd);
      showToast("Precio actualizado");
      await loadData();
      if (selectedApp) {
        const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
        const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
        setSelectedApp(updatedSelected);
      }
    } catch (e) {
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
      setEditingExtraPriceId(null);
    }
  };

  // Editar el monto de un producto (p. ej. si se vendió más caro, incluye cortesías).
  // El input edita el TOTAL de la línea en Bs (lo que se muestra); se guarda como precio
  // unitario en USD. Se actualiza el carrito al instante y, si el producto ya está en la
  // cita (lo agregó el barbero), se persiste para que no se revierta al recargar.
  const handleUpdateProductPrice = async (product, newTotalBs) => {
    const qty = Number(product.quantity) || 1;
    const totalBs = parseFloat(newTotalBs) || 0;
    const totalUsd = fixedRate > 0 ? (totalBs / fixedRate) : 0;
    const unitUsd = qty > 0 ? (totalUsd / qty) : totalUsd;
    setCart(prev => prev.map(p => p.id === product.id ? { ...p, price: unitUsd } : p));
    setEditingProductId(null);
    if (product.dbIds && product.dbIds.length > 0) {
      try {
        for (const dbId of product.dbIds) {
          await dataService.updateAppointmentProductPrice(dbId, unitUsd);
        }
      } catch (e) {
        showToast("Error al guardar el precio", "error");
        return;
      }
    }
    showToast("Precio actualizado");
  };

  const handleSaveServicePrice = async () => {
    if (!editingAppPrice) return;
    try {
      setLoading(true);
      const newPriceBs = parseFloat(newAppPriceVal) || 0;
      const newPriceUsd = fixedRate > 0 ? (newPriceBs / fixedRate) : 0;
      if (newPriceUsd > 0 && newPriceUsd < MIN_PLAUSIBLE_SERVICE_USD) {
        showToast(`Ese monto equivale a $${newPriceUsd.toFixed(4)} — el campo es en bolívares, no en dólares. Revisa la cifra.`, "warning");
        return;
      }
      await dataService.updateAppointment(editingAppPrice.id, { total_price: newPriceUsd });
      showToast("Precio del servicio actualizado");
      await loadData();
      
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
      
      setEditingAppPrice(null);
    } catch (e) {
      console.error(e);
      showToast("Error al actualizar precio", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (rates?.usd) setFixedRate(rates.usd);

    const channel = supabase
      .channel('checkout-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'odontosonrisa',
        table: 'appointments'
      }, () => {
        loadData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'odontosonrisa',
        table: 'appointment_staff'
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rates]);

  useEffect(() => {
    initOfflineService();
    const unsubscribe = subscribeToQueue(setPendingOfflineCount);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedApp) {
      const clientPendingApps = pendingServices.filter(
        app => app.client_id === selectedApp.client_id
      );
      
      const uniqueApps = [
        selectedApp, 
        ...clientPendingApps.filter(app => app.id !== selectedApp.id)
      ];
      setBundledApps(uniqueApps);
    } else {
      setBundledApps([]);
    }
  }, [selectedApp, pendingServices]);

  useEffect(() => {
    setLinkedApps([]);
    userSetWashCountRef.current = false;
  }, [selectedApp]);

  // Every client/order owns an independent tip form. Without this reset, the
  // manually-added rows from the previously viewed order survived and were
  // shown beside the staff of the next client (even when their amount was 0).
  useEffect(() => {
    setTips([]);
    setOpenTipDropdownId(null);
  }, [selectedApp?.id, selectedClient?.id, isDirectSale]);

  // Reset coupon state & fetch client coupons when appointment changes
  useEffect(() => {
    setCouponCode('');
    setActiveCoupon(null);
    setCouponDiscount(0);
    const fetchCoupons = async () => {
      const cId = selectedApp?.client_id;
      if (cId) {
        try {
          const fetched = await dataService.getCoupons(cId);
          setClientCoupons(fetched.filter(c => c.status === 'UNUSED'));
        } catch(e) {
          console.error('Error fetching coupons', e);
        }
      } else {
        setClientCoupons([]);
      }
    };
    fetchCoupons();
  }, [selectedApp]);


  useEffect(() => {
    setTotalAppsInCheckout([...bundledApps, ...linkedApps]);
  }, [bundledApps, linkedApps]);

  // Auto-apply coupon from metadata
  useEffect(() => {
    if (selectedApp?.metadata?.coupon_id && clientCoupons.length > 0 && !activeCoupon) {
      const autoCoupon = clientCoupons.find(c => c.id === selectedApp.metadata.coupon_id);
      if (autoCoupon) {
        setActiveCoupon(autoCoupon);
        // Calculate discount
        const wRate = getWashingRate(allStaff.find(s => s.id === selectedWasherId));
        const discount = calculateCouponDiscount(autoCoupon, totalAppsInCheckout, washCount, wRate);
        setCouponDiscount(discount);
        showToast(`Cupón automático aplicado: ${autoCoupon.prize_name}`, "success");
      }
    }
  }, [selectedApp, clientCoupons, totalAppsInCheckout, activeCoupon, selectedWasherId, washCount, allStaff]);


  useEffect(() => {
    // selectedApp changes one render before the derived bundle. Do not rebuild
    // tips from that one-frame stale bundle, or the previous barber gets added
    // back immediately after the order reset above.
    if (
      selectedApp
      && totalAppsInCheckout.length > 0
      && !totalAppsInCheckout.some(app => app.id === selectedApp.id)
    ) {
      return;
    }

    if (totalAppsInCheckout.length > 0) {
      // 1. Merge products
      const mergedProducts = [];
      totalAppsInCheckout.forEach(app => {
        app.appointment_products?.forEach(ap => {
          const exists = mergedProducts.find(p => p.id === ap.inventory?.id);
          if (exists) {
            exists.quantity += ap.quantity;
            if (ap.id) exists.dbIds.push(ap.id);
          } else {
            mergedProducts.push({
              id: ap.inventory?.id,
              name: ap.inventory?.name,
              price: ap.price,
              quantity: ap.quantity,
              commission_pct: ap.inventory?.commission_pct,
              dbIds: ap.id ? [ap.id] : []
            });
          }
        });
      });
      setCart(mergedProducts);

      // 2. Initialize tips for all unique staff in the bundle, preserving existing values
      const uniqueStaffIds = Array.from(new Set(totalAppsInCheckout.map(a => a.staff_id).filter(Boolean)));
      setTips(prevTips => {
        const existingMap = {};
        prevTips.forEach(t => {
          if (t.staffId) existingMap[t.staffId] = t;
        });

        const newTips = uniqueStaffIds.map((staffId, idx) => {
          const existing = existingMap[staffId];
          if (existing) {
            return existing;
          }
          return {
            id: (Date.now() + idx).toString(),
            staffId: staffId,
            amount: 0,
            currency: 'USD'
          };
        });

        // Preservar propinas agregadas manualmente para staff que no sea el principal de las citas
        prevTips.forEach(t => {
          if (t.staffId && !uniqueStaffIds.includes(t.staffId)) {
            newTips.push(t);
          }
        });

        return newTips;
      });

      // 3. A wash only exists when the operational flow documented it.
      // Services may include "Lavado" in their description, but that does not
      // mean the client was actually sent to the wash area.
      const existingWasherRecords = totalAppsInCheckout
        .flatMap(app => (app.appointment_staff || []).map(record => ({ ...record, appointmentId: app.id })))
        .filter(record => record.staff?.role?.toLowerCase().includes('asistente'));
      const documentedWashAppointments = new Set(existingWasherRecords.map(record => record.appointmentId));
      totalAppsInCheckout.forEach(app => {
        if (app.status === 'En Lavado') documentedWashAppointments.add(app.id);
      });

      if (!userSetWashCountRef.current) {
        setWashCount(documentedWashAppointments.size);
      }

      // Preserve the assistant selected during the real wash flow. Never pick
      // one automatically merely because only one assistant is available.
      const existingWasherRecord = existingWasherRecords[0];

      let currentWasherId = '';
      if (existingWasherRecord) {
        currentWasherId = existingWasherRecord.staff_id;
      }

      // Use functional update to avoid needing selectedWasherId in deps
      setSelectedWasherId(prev => prev !== currentWasherId ? currentWasherId : prev);

      // 4. Initialize item sales associations intelligently
      // Use functional update to avoid needing itemSalesAssociations in deps
      const finalWasherId = currentWasherId;
      setItemSalesAssociations(prev => {
        const newAssociations = { ...prev };
        let changed = false;

        totalAppsInCheckout.forEach(app => {
          // Products default association
          app.appointment_products?.forEach(ap => {
            const itemId = ap.inventory?.id;
            if (itemId && !newAssociations[itemId]) {
              newAssociations[itemId] = app.staff_id || '';
              changed = true;
            }
          });

          // Extras default association. Un extra de lavado va a la asistente: la que se
          // documentó en el flujo (finalWasherId) o, si hay una sola en el sistema, esa.
          app.appointment_extras?.forEach(ex => {
            const itemId = ex.id;
            if (itemId && !newAssociations[itemId]) {
              const isWashExtra = isWashExtraName(ex.service_extras?.name);
              const washAssistantId = finalWasherId || getSoleAssistantId(allStaff);
              if (isWashExtra && washAssistantId) {
                newAssociations[itemId] = washAssistantId;
              } else {
                newAssociations[itemId] = app.staff_id || '';
              }
              changed = true;
            }
          });
        });

        return changed ? newAssociations : prev;
      });
    } else if (!selectedApp && !isDirectSale) {
      setCart([]);
      setTips([]);
      setWashCount(0);
      setSelectedWasherId(prev => prev === '' ? prev : '');
      setItemSalesAssociations(prev => Object.keys(prev).length === 0 ? prev : {});
    }
  }, [totalAppsInCheckout, isDirectSale, allStaff, selectedApp]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apps, inv, ext, cls, staff, srv] = await Promise.all([
        dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']),
        dataService.getSellableInventory(),
        dataService.getExtras(),
        dataService.getClients(),
        dataService.getStaff(),
        dataService.getServices()
      ]);
      
      // Compare using local calendar-day components, not toISOString() (UTC) -
      // Venezuela is UTC-4, so an appointment scheduled after ~8pm local time
      // lands on the "next day" in UTC and would never match "today" if both
      // sides were compared as UTC date strings.
      const getLocalDateStr = (d) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const todayLocal = getLocalDateStr(new Date());
      const filtered = apps.filter(a =>
        a.status !== 'Agendado' ||
        (getLocalDateStr(a.scheduled_at) === todayLocal || getLocalDateStr(a.created_at) === todayLocal)
      );

      setPendingServices(filtered);

      const preselectId = preselectAppId || sessionStorage.getItem('panda_preselect_appointment_id');
      if (preselectId) {
        if (!preselectAppId) sessionStorage.removeItem('panda_preselect_appointment_id');
        const targetApp = filtered.find(a => a.id === preselectId);
        if (targetApp) {
          setSelectedApp(targetApp);
        }
      }

      setInventory(filterSellableInventory(inv));
      setAllExtras(ext?.filter(e => e.name !== 'SYSTEM_CONFIG_RATES') || []);
      setAllServices(srv || []);
      setAllClients(cls || []);
      setAllStaff(staff || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAppointment = async (id) => {
    try {
      setLoading(true);
      await dataService.updateAppointmentStatus(id, 'En Silla');
      showToast("¡Servicio iniciado! El cliente ya está en sillón.");
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGroupAppointments = async (apps) => {
    try {
      setLoading(true);
      for (const app of apps) {
        await dataService.updateAppointmentStatus(app.id, 'En Silla');
      }
      showToast("¡Servicios iniciados! El cliente ya está en sillón.");
      loadData();
    } catch (error) {
      showToast("Error al iniciar servicios", "error");
    } finally {
      setLoading(false);
    }
  };

  const servicePrice = useMemo(() => totalAppsInCheckout.reduce((acc, app) => acc + (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)), 0), [totalAppsInCheckout]);
  const productsTotal = useMemo(() => cart.reduce((acc, p) => acc + (p.price * p.quantity), 0), [cart]);
  const extrasTotal = useMemo(() => totalAppsInCheckout.reduce((acc, app) => acc + (app.appointment_extras?.reduce((subAcc, e) => subAcc + (e.price || 0), 0) || 0), 0), [totalAppsInCheckout]);
  const totalTips = useMemo(() => tips.reduce((acc, t) => {
    const isBs = t.currency === 'BS';
    const amountVal = Number(t.amount || 0);
    const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
    return acc + usdVal;
  }, 0), [tips, fixedRate]);
  const totalUsd = useMemo(() => Math.max(0, servicePrice + productsTotal + extrasTotal + totalTips - couponDiscount), [servicePrice, productsTotal, extrasTotal, totalTips, couponDiscount]);
  const totalBs = useMemo(() => (totalUsd * fixedRate).toFixed(2), [totalUsd, fixedRate]);

  // Arma una VISTA PREVIA del recibo con el estado actual del carrito (antes de cobrar).
  // Mismo formato que el recibo final, pero sin número de orden asignado.
  const buildPreviewReceipt = () => {
    const currency = paymentMode === 'mixed' ? 'both' : paymentMode === 'full_bs' ? 'bs' : 'usd';
    const paymentMethodLabel = paymentMode === 'mixed' ? `${methodUsd} + ${methodBs}` : paymentMode === 'full_bs' ? methodBs : methodUsd;
    const clientName = selectedApp?.clients?.name || selectedClient?.name || 'Cliente';
    const barberNames = Array.from(new Set(totalAppsInCheckout.map(a => a.staff?.name).filter(Boolean))).join(', ');
    return {
      preview: true,
      orderNumber: null,
      currency,
      rate: fixedRate,
      client: { name: clientName },
      staff: { name: barberNames },
      items: [
        ...totalAppsInCheckout.map(app => ({
          name: app.services?.name || 'Servicio',
          price: (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)),
          quantity: 1
        })),
        ...cart.map(p => ({ name: p.name, price: p.price, quantity: p.quantity })),
        ...totalAppsInCheckout.flatMap(app => (app.appointment_extras || []).map(e => ({ name: e.service_extras?.name || 'Extra', price: e.price, quantity: 1 }))),
      ],
      paymentMethodLabel,
      reference: paymentReferenceBs || '',
      subtotal: servicePrice + productsTotal + extrasTotal,
      discount: couponDiscount,
      total: totalUsd,
      generated_at: new Date().toISOString(),
    };
  };
  
  const remainingBs = useMemo(() => Math.max(0, (totalUsd - Number(cashUsd)) * fixedRate).toFixed(2), [totalUsd, cashUsd, fixedRate]);

  const washEligibleCount = useMemo(() => {
    const washIncludedInServiceCount = totalAppsInCheckout.filter(app =>
      app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || 
      app.appointment_extras?.some(e => e.service_extras?.name?.toLowerCase().includes('lavado'))
    ).length;
    const documentedWashCount = new Set(totalAppsInCheckout.flatMap(app => {
      const hasAssistant = (app.appointment_staff || []).some(record => record.staff?.role?.toLowerCase().includes('asistente'));
      return (hasAssistant || app.status === 'En Lavado') ? [app.id] : [];
    })).size;
    return Math.max(washIncludedInServiceCount, documentedWashCount);
  }, [totalAppsInCheckout]);

  const didWash = washCount > 0;

  const handleAddToCart = async (product) => {
    const currentQuantity = selectedApp
      ? (selectedApp.appointment_products || [])
          .filter(ap => ap.inventory?.id === product.id)
          .reduce((sum, ap) => sum + Number(ap.quantity || 0), 0)
      : Number(cart.find(p => p.id === product.id)?.quantity || 0);
    if (Number(product.stock || 0) <= currentQuantity) {
      showToast(`No hay más unidades disponibles de ${product.name}`, 'error');
      return;
    }

    if (!selectedApp) {
      const exists = cart.find(p => p.id === product.id);
      if (exists) {
        setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
      } else {
        setCart([...cart, {...product, quantity: 1}]);
      }
      showToast(`${product.name} añadido`);
      return;
    }

    try {
      setLoading(true);
      // Check if product already exists in selectedApp's products
      const existingProductRecord = selectedApp.appointment_products?.find(
        ap => ap.inventory?.id === product.id
      );

      if (existingProductRecord) {
        await dataService.updateAppointmentProductQuantity(
          existingProductRecord.id,
          (existingProductRecord.quantity || 0) + 1
        );
      } else {
        await dataService.addProductToAppointment(
          selectedApp.id,
          product.id,
          1,
          product.price
        );
      }

      showToast(`${product.name} añadido a la cuenta.`);
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al añadir producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveProduct = async (product) => {
    if (!selectedApp) {
      setCart(cart.filter(item => item.id !== product.id));
      showToast("Producto eliminado del carrito");
      return;
    }

    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        for (const dbId of product.dbIds) {
          await dataService.removeProductFromAppointment(dbId);
        }
      }
      showToast(`${product.name} eliminado de la cuenta.`);
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al eliminar producto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementProduct = async (product) => {
    const inventoryProduct = inventory.find(item => item.id === product.id) || product;
    if (Number(product.quantity || 0) >= Number(inventoryProduct.stock || 0)) {
      showToast(`Stock máximo alcanzado para ${product.name}`, 'error');
      return;
    }

    if (!selectedApp) {
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity + 1} : p));
      return;
    }
    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        const record = selectedApp.appointment_products?.find(ap => ap.id === product.dbIds[0]);
        if (record) {
          await dataService.updateAppointmentProductQuantity(record.id, (record.quantity || 0) + 1);
        }
      }
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al incrementar cantidad", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrementProduct = async (product) => {
    if (product.quantity <= 1) {
      handleRemoveProduct(product);
      return;
    }
    if (!selectedApp) {
      setCart(cart.map(p => p.id === product.id ? {...p, quantity: p.quantity - 1} : p));
      return;
    }
    try {
      setLoading(true);
      if (product.dbIds && product.dbIds.length > 0) {
        const record = selectedApp.appointment_products?.find(ap => ap.id === product.dbIds[0]);
        if (record) {
          await dataService.updateAppointmentProductQuantity(record.id, (record.quantity || 0) - 1);
        }
      }
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al disminuir cantidad", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExtra = async (extra) => {
    if (!selectedApp) {
      setCart([...cart, { id: 'extra_' + extra.id, name: extra.name, price: extra.price, quantity: 1, type: 'extra' }]);
      showToast(`${extra.name} añadido al carrito`);
      return;
    }
    try {
      setLoading(true);
      await dataService.addExtraToAppointment(selectedApp.id, extra.id, extra.price);
      showToast(`${extra.name} añadido a la cuenta.`);
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al añadir extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExtra = async (extraId) => {
    try {
      setLoading(true);
      await dataService.removeExtraFromAppointment(extraId);
      showToast("Extra eliminado.");
      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      showToast("Error al eliminar extra", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkApp = (appId) => {
    setLinkedApps(linkedApps.filter(a => a.id !== appId));
    showToast("Cita desenlazada de la cuenta.");
  };

  const handleCancelOrder = () => {
    // In direct sale mode there are no appointments — just reset and close panel
    if (isDirectSale) {
      setIsDirectSale(false);
      setSelectedClient(null);
      setSelectedApp(null);
      setCart([]);
      setTips([]);
      setCashUsd(0);
      setPaymentMode('full_bs');
      setSettlementType('paid');
      setExchangeStaffId('');
      setMethodBs('Pago Móvil');
      setPaymentReferenceBs('');
      setDirectSaleIdSearch('');
      setDirectSaleSearchResults([]);
      showToast('Venta directa cancelada', 'info');
      return;
    }

    if (totalAppsInCheckout.length === 0) return;
    
    setDialog({
      isOpen: true,
      title: "Cancelar Orden",
      message: `¿Seguro que deseas cancelar toda la orden de este cliente? Se marcarán los servicios como 'Cancelado'.`,
      type: "confirm",
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          
          for (const app of totalAppsInCheckout) {
            await dataService.updateAppointmentStatus(app.id, 'Cancelado');
          }
          
          showToast("Orden cancelada correctamente", "success");
          setSelectedApp(null);
          setSelectedClient(null);
          setMethodBs('Pago Móvil');
          setPaymentReferenceBs('');
          await loadData();
        } catch (e) {
          console.error(e);
          showToast("Error al cancelar la orden", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleProcessCheckout = async () => {
    if (!selectedApp && !selectedClient) {
      showToast("Selecciona un cliente para la venta directa", "warning");
      return;
    }
    if (!selectedApp && cart.length === 0) {
      showToast("Agrega al menos un producto al carrito", "warning");
      return;
    }

    const hasAssignedService = totalAppsInCheckout.some(app => app.service_id && app.services?.name);
    if (selectedApp && !hasAssignedService && cart.length === 0) {
      showToast("Asigna primero el servicio realizado. No se registrará como venta de productos.", "warning");
      return;
    }

    if (settlementType === 'exchange' && cart.length > 0) {
      showToast("El intercambio del odontólogo solo puede aplicarse a servicios. Retira los productos del carrito.", "warning");
      return;
    }

    if (totalUsd <= 0) {
      showToast("No se puede registrar una venta en $0,00. Revisa el precio del producto o servicio.", "warning");
      return;
    }

    const hasBsPayment = settlementType === 'paid' && (paymentMode === 'full_bs' || (paymentMode === 'mixed' && Number(remainingBs) > 0));
    const referenceRequired = hasBsPayment && ['Pago Móvil', 'Punto de venta'].includes(methodBs);
    const normalizedBsReference = paymentReferenceBs.trim();

    if (referenceRequired && !normalizedBsReference) {
      showToast(`Ingresa la referencia de ${methodBs}.`, "warning");
      return;
    }
    if (hasBsPayment && methodBs === 'Pago Móvil' && !/^\d{4}$/.test(normalizedBsReference)) {
      showToast("La referencia de Pago Móvil debe tener exactamente 4 dígitos.", "warning");
      return;
    }

    try {
      setLoading(true);
      
      const paymentData = {
        appointmentId: selectedApp?.id || null,
        appointmentIds: totalAppsInCheckout.map(a => a.id),
        clientId: selectedApp?.client_id || selectedClient?.id,
        clientName: selectedApp?.clients?.name || selectedClient?.name,
        clientCedula: selectedApp?.clients?.id_card || selectedClient?.id_card,
        serviceName: totalAppsInCheckout.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Venta de Productos',
        totalUsd: totalUsd,
        fixedRate: fixedRate,
        settlementType,
        isMixed: settlementType === 'paid' && paymentMode === 'mixed',
        cashUsd: settlementType === 'paid' ? Number(cashUsd) : 0,
        transferBs: settlementType === 'paid' ? Number(remainingBs) : 0,
        totalTips: totalTips,
        didWash: washCount > 0,
        washCount: washCount,
        washRate: getWashingRate(allStaff.find(member => member.id === selectedWasherId)),
        washAssistantSharePct: WASH_ASSISTANT_SHARE * 100,
        extras: totalAppsInCheckout.flatMap(a => a.appointment_extras || []),
        appointments: totalAppsInCheckout.map(app => {
          const appExtrasTotal = app.appointment_extras?.reduce((sum, e) => sum + (e.price || 0), 0) || 0;
          const servicePrice = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0);
          const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('lavado')) || false;
          return {
            id: app.id,
            staff_id: app.staff_id,
            clientName: app.clients?.name || 'Cliente',
            clientCedula: app.clients?.id_card || 'S/C',
            barberName: app.staff?.name || 'Odontólogo',
            serviceName: app.services?.name || 'Servicio',
            servicePrice: servicePrice,
            extrasPrice: appExtrasTotal,
            totalPrice: servicePrice + appExtrasTotal,
            didWash: includesWashing || (washCount > 0),
            extras: app.appointment_extras?.map(e => e.service_extras?.name).filter(Boolean).join(', ') || ''
          };
        }),
        staffInvolved: (() => {
          const involved = [];
          const washer = allStaff.find(s => s.id === selectedWasherId);
          const washRate = getWashingRate(washer);
          
          let appliedWashes = 0;
          totalAppsInCheckout.forEach(app => {
            if (!app.staff_id) return;
            const role = (app.staff?.role || '').split('|')[0].toLowerCase();
            let price = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0);
            let grossBase = price;

            const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('lavado'));
            if (includesWashing && appliedWashes < washCount && washRate > 0) {
              grossBase = Math.max(0, grossBase - washRate);
              appliedWashes++;
            }

            const isServiceProfessional = role.includes('barber') || role.includes('tatu');
            const pct = isServiceProfessional ? Number(app.staff?.commission_pct ?? 60) : 0;

            const comm = grossBase * (pct / 100);
            const tipVal = tips.filter(t => t.staffId === app.staff_id).reduce((acc, t) => {
              const isBs = t.currency === 'BS';
              const amountVal = Number(t.amount || 0);
              const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
              return acc + usdVal;
            }, 0);

            const existing = involved.find(i => i.staffId === app.staff_id);
            if (existing) {
              existing.commissionEarned += comm;
              existing.commissionBs += comm * fixedRate;
            } else {
              involved.push({
                staffId: app.staff_id,
                name: app.staff?.name || 'Odontólogo',
                role: app.staff?.role || 'Barbero',
                commissionPct: pct,
                commissionEarned: comm,
                commissionBs: comm * fixedRate,
                productCommissionEarned: 0,
                productCommissionBs: 0,
                tip: tipVal,
                tipBs: tipVal * fixedRate
              });
            }
          });

          if (washCount > 0 && selectedWasherId) {
            const washGrossAmount = washCount * washRate;
            const washCommission = washGrossAmount * WASH_ASSISTANT_SHARE;
            const existing = involved.find(i => i.staffId === selectedWasherId);
            if (existing) {
              existing.commissionEarned += washCommission;
              existing.commissionBs += washCommission * fixedRate;
            } else {
              const tipValW = tips.filter(t => t.staffId === selectedWasherId).reduce((acc, t) => {
                const isBs = t.currency === 'BS';
                const amountVal = Number(t.amount || 0);
                const usdVal = isBs ? (amountVal / fixedRate) : amountVal;
                return acc + usdVal;
              }, 0);
              involved.push({
                staffId: selectedWasherId,
                name: washer?.name || 'Asistente',
                role: washer?.role || 'Asistente de Lavado',
                commissionPct: WASH_ASSISTANT_SHARE * 100,
                commissionEarned: washCommission,
                commissionBs: washCommission * fixedRate,
                productCommissionEarned: 0,
                tip: tipValW,
                tipBs: tipValW * fixedRate
              });
            }
          }

          tips.forEach(t => {
            if (!t.staffId) return;
            const existing = involved.find(i => i.staffId === t.staffId);
            if (!existing) {
              const staffObj = allStaff.find(s => s.id === t.staffId);
              const isBs = t.currency === 'BS';
              const tipValT = isBs ? (Number(t.amount || 0) / fixedRate) : Number(t.amount || 0);
              involved.push({
                staffId: t.staffId,
                name: staffObj?.name || 'Staff',
                role: staffObj?.role || 'Barbero',
                commissionEarned: 0,
                productCommissionEarned: 0,
                tip: tipValT,
                tipBs: tipValT * fixedRate
              });
            }
          });


 
          // 5. Productos: SIN comisión al staff. Los productos (bebidas, etc.) son 100% de
          // Dientes Sanos (la casa se queda venta − costo). Los Odontólogos no ganan nada por productos.
          // Se conserva el vendedor (sellerName) solo para el historial, no para comisión.

          // 6. Extras Commission Assignment. Un extra (ej. "lavado premium") genera
          // comisión igual que un servicio: al vendedor asignado en caja
          // (itemSalesAssociations[extra.id]) o, si no se asignó, al barbero de la cita.
          // Excepción: los extras de LAVADO son de la asistente (al 60% fijo, como los
          // lavados incluidos), no del barbero — si hay una sola asistente, cae en ella.
          const soleAssistantId = getSoleAssistantId(allStaff);
          totalAppsInCheckout.forEach(app => {
            (app.appointment_extras || []).forEach(ex => {
              const isWashExtra = isWashExtraName(ex.service_extras?.name);
              const assignedStaffId = itemSalesAssociations[ex.id]
                || (isWashExtra ? soleAssistantId : '')
                || app.staff_id;
              if (!assignedStaffId) return;
              const staffObj = allStaff.find(s => s.id === assignedStaffId);
              const pct = isWashExtra ? (WASH_ASSISTANT_SHARE * 100) : Number(staffObj?.commission_pct ?? 60);
              const extraComm = (Number(ex.price) || 0) * (pct / 100);
              if (extraComm <= 0) return;
              const existing = involved.find(i => i.staffId === assignedStaffId);
              if (existing) {
                existing.commissionEarned = (existing.commissionEarned || 0) + extraComm;
                existing.commissionBs = (existing.commissionBs || 0) + (extraComm * fixedRate);
              } else {
                involved.push({
                  staffId: assignedStaffId,
                  name: staffObj?.name || 'Staff',
                  role: staffObj?.role || 'Staff',
                  commissionPct: pct,
                  commissionEarned: extraComm,
                  commissionBs: extraComm * fixedRate,
                  productCommissionEarned: 0,
                  productCommissionBs: 0,
                  tip: 0,
                  tipBs: 0
                });
              }
            });
          });

          // Do not persist placeholder participants created only to render a $0 tip.
          // A staff member belongs in payroll only when there is a real commission,
          // product commission or tip assigned to them.
          return involved.filter(member =>
            Number(member.commissionEarned || 0) > 0 ||
            Number(member.productCommissionEarned || 0) > 0 ||
            Number(member.tip || 0) > 0
          );
        })(),
        products: cart.map(p => {
          const sellerId = itemSalesAssociations[p.id];
          const seller = allStaff.find(s => s.id === sellerId);
          return {
            ...p,
            sellerName: seller ? seller.name : 'Venta Directa'
          };
        }),
        methodUsd: methodUsd,
        methodBs: methodBs,
        paymentReferenceBs: referenceRequired ? normalizedBsReference : null
      };

      paymentData.serviceStaff = totalAppsInCheckout
        .filter(app => app.staff_id)
        .map(app => ({ staffId: app.staff_id, name: app.staff?.name || 'Profesional', role: app.staff?.role || 'Barbero' }));
      paymentData.pendingStaffInvolved = paymentData.staffInvolved;

      // Desglose por-cita para la tabla appointment_staff. `staffInvolved` (arriba)
      // agrega por persona para la nómina, lo que pierde DE QUÉ cita vino cada comisión.
      // El panel del barbero consulta appointment_staff por el barbero dueño de la cita
      // (appointments.staff_id), así que la comisión de servicio de cada barbero debe
      // quedar bajo la cita que él realmente hizo — si no, en un pago grupal el segundo
      // barbero ve un estimado en vez de su número real. Estas filas mantienen ese mapeo.
      paymentData.appointmentStaff = (() => {
        const primaryAppId = selectedApp?.id || totalAppsInCheckout[0]?.id || null;
        const rows = [];
        const getRow = (appointmentId, staffId) => {
          if (!appointmentId || !staffId) return null;
          let r = rows.find(x => String(x.appointmentId) === String(appointmentId) && String(x.staffId) === String(staffId));
          if (!r) { r = { appointmentId, staffId, commissionEarned: 0, productCommissionEarned: 0, tipAmount: 0 }; rows.push(r); }
          return r;
        };
        // Cita que el staff posee (es su barbero); si no posee ninguna, cae a la principal.
        const ownedAppId = (staffId) => {
          const owned = totalAppsInCheckout.find(a => String(a.staff_id) === String(staffId));
          return owned ? owned.id : primaryAppId;
        };

        const washer = allStaff.find(s => s.id === selectedWasherId);
        const washRate = getWashingRate(washer);
        const soleAssistantId = getSoleAssistantId(allStaff);
        let appliedWashes = 0;

        // Comisión de servicio + extras → al barbero de cada cita, bajo esa misma cita
        totalAppsInCheckout.forEach(app => {
          if (app.staff_id) {
            const role = (app.staff?.role || '').split('|')[0].toLowerCase();
            let grossBase = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0);
            const includesWashing = app.services?.included_items?.some(i => i.toLowerCase().includes('lavado'));
            if (includesWashing && appliedWashes < washCount && washRate > 0) {
              grossBase = Math.max(0, grossBase - washRate);
              appliedWashes++;
            }
            const isServiceProfessional = role.includes('barber') || role.includes('tatu');
            const pct = isServiceProfessional ? Number(app.staff?.commission_pct ?? 60) : 0;
            const comm = grossBase * (pct / 100);
            const row = getRow(app.id, app.staff_id);
            if (row) row.commissionEarned += comm;
          }
          (app.appointment_extras || []).forEach(ex => {
            const isWashExtra = isWashExtraName(ex.service_extras?.name);
            const assignedStaffId = itemSalesAssociations[ex.id]
              || (isWashExtra ? soleAssistantId : '')
              || app.staff_id;
            if (!assignedStaffId) return;
            const staffObj = allStaff.find(s => s.id === assignedStaffId);
            const pct = isWashExtra ? (WASH_ASSISTANT_SHARE * 100) : Number(staffObj?.commission_pct ?? 60);
            const extraComm = (Number(ex.price) || 0) * (pct / 100);
            if (extraComm <= 0) return;
            const row = getRow(app.id, assignedStaffId);
            if (row) row.commissionEarned += extraComm;
          });
        });

        // Comisión de lavado → la asistente, bajo la cita principal (su panel recorre
        // todas las citas, así que aquí la propiedad de la cita no importa).
        if (washCount > 0 && selectedWasherId) {
          const washCommission = washCount * washRate * WASH_ASSISTANT_SHARE;
          if (washCommission > 0) {
            const row = getRow(primaryAppId, selectedWasherId);
            if (row) row.commissionEarned += washCommission;
          }
        }

        // Productos: SIN comisión al staff — son 100% de Dientes Sanos (ver bloque de staffInvolved).

        // Propinas → al staff, bajo una cita que posea (o la principal)
        tips.forEach(t => {
          if (!t.staffId) return;
          const isBs = t.currency === 'BS';
          const tipVal = isBs ? (Number(t.amount || 0) / fixedRate) : Number(t.amount || 0);
          if (tipVal <= 0) return;
          const row = getRow(ownedAppId(t.staffId), t.staffId);
          if (row) row.tipAmount += tipVal;
        });

        return rows.filter(r => r.commissionEarned > 0 || r.productCommissionEarned > 0 || r.tipAmount > 0);
      })();

      if (settlementType === 'courtesy' || settlementType === 'receivable') {
        paymentData.staffInvolved = [];
        paymentData.appointmentStaff = [];
      }

      if (settlementType === 'exchange') {
        const responsibleStaffId = exchangeStaffId || totalAppsInCheckout.find(app => app.staff_id)?.staff_id;
        const responsibleStaff = allStaff.find(member => String(member.id) === String(responsibleStaffId));
        if (!responsibleStaffId || !responsibleStaff) {
          showToast("Selecciona el odontólogo responsable del intercambio", "warning");
          setLoading(false);
          return;
        }

        let washesApplied = 0;
        let exchangeChargeUsd = 0;
        totalAppsInCheckout.forEach(app => {
          if (!app.staff_id) return;
          const serviceValue = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0
            ? Number(app.total_price)
            : Number(app.services?.price || 0);
          const includesWash = app.services?.included_items?.some(item => item.toLowerCase().includes('lavado')) || false;
          const hasWashExtra = app.appointment_extras?.some(extra => extra.service_extras?.name?.toLowerCase().includes('lavado')) || false;
          const applyWash = washesApplied < washCount && (includesWash || hasWashExtra || washCount > 0);
          const washValue = applyWash ? getWashingRate(allStaff.find(member => member.id === selectedWasherId)) : 0;
          if (applyWash) washesApplied += 1;
          const distributableService = Math.max(0, serviceValue - washValue);
          const commissionPct = Number(app.staff?.commission_pct ?? 60);
          const shopServiceShare = distributableService * (Math.max(0, 100 - commissionPct) / 100);
          exchangeChargeUsd += shopServiceShare + washValue;
        });

        paymentData.exchangeStaffId = responsibleStaffId;
        paymentData.exchangeStaffName = responsibleStaff.name;
        paymentData.exchangeChargeUsd = exchangeChargeUsd;
        paymentData.exchangeChargeBs = exchangeChargeUsd * fixedRate;
        paymentData.staffInvolved = paymentData.pendingStaffInvolved.filter(member => {
          const role = String(member.role || '').toLowerCase();
          return role.includes('asistente') || role.includes('lavado');
        });
        // En intercambio solo el lavado genera comisión: deja únicamente esas filas.
        paymentData.appointmentStaff = paymentData.appointmentStaff.filter(r => {
          const st = allStaff.find(s => String(s.id) === String(r.staffId));
          const role = String(st?.role || '').toLowerCase();
          return role.includes('asistente') || role.includes('lavado');
        });
      }

      await enqueuePayment(paymentData);
      
      // Enviar notificación Push y agregar a historial local
      let paymentDetail = '';
      if (paymentMode === 'full_usd') {
        paymentDetail = `por un total de $${Number(paymentData.totalUsd).toFixed(2)} USD (${methodUsd})`;
      } else if (paymentMode === 'full_bs') {
        const amountBs = Number(paymentData.totalUsd) * Number(paymentData.fixedRate);
        paymentDetail = `por un total de ${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs. (${methodBs})`;
      } else {
        const cashPart = Number(cashUsd);
        const transferPart = Number(paymentData.transferBs);
        paymentDetail = `por un total mixto de $${cashPart.toFixed(2)} USD (${methodUsd}) y ${transferPart.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs. (${methodBs})`;
      }

      notificationService.sendNotification(
        'Cobro Realizado',
        `Se completó el cobro de ${paymentData.clientName || 'Cliente'} ${paymentDetail}.`
      );
      
      // Transmitir notificación en tiempo real a otros dispositivos (Admin)
      notificationService.broadcastNotification(
        dataService.supabase,
        'Cobro Realizado',
        `Se completó el cobro de ${paymentData.clientName || 'Cliente'} ${paymentDetail}.`,
        { recipientRole: 'Admin' }
      );
      

      // Redeem coupon if active
      if (activeCoupon?.id) {
        try { await dataService.redeemCoupon(activeCoupon.id); } catch(e) { console.error('Error redeeming coupon', e); }
      }
      // Schedule WhatsApp reminder
      if (selectedApp) {
        try {
          let followUpDate = null;
          if (reminderPreset === 'custom' && reminderDate) {
            followUpDate = reminderDate;
          } else if (reminderPreset === '1_week') {
            const d = new Date(); d.setDate(d.getDate() + 7); followUpDate = d.toISOString();
          } else if (reminderPreset === '1_month') {
            const d = new Date(); d.setMonth(d.getMonth() + 1); followUpDate = d.toISOString();
          } else {
            const d = new Date(); d.setDate(d.getDate() + 14); followUpDate = d.toISOString();
          }
          if (typeof whatsappService.scheduleFollowUpReminder === 'function') {
            await whatsappService.scheduleFollowUpReminder(selectedApp.client_id, selectedApp.id, followUpDate);
          }
        } catch(e) { console.error('Error scheduling reminder', e); }
      }

      // Número de orden secuencial (#0001, #0002...) para el recibo.
      const orderNumber = await dataService.getNextOrderNumber().catch(() => null);

      // Moneda del recibo según el método de pago: $ si se pagó en dólares, Bs si en bolívares,
      // ambas si fue mixto. Fiado/cortesía/intercambio se muestran en $ (nominal).
      let receiptCurrency;
      if (settlementType !== 'paid') receiptCurrency = 'usd';
      else if (paymentMode === 'mixed') receiptCurrency = 'both';
      else if (paymentMode === 'full_bs') receiptCurrency = 'bs';
      else receiptCurrency = 'usd';

      // Método de pago y referencia (una línea, como en el formato de la comanda).
      let paymentMethodLabel;
      if (settlementType === 'receivable') paymentMethodLabel = 'Fiado / Cuenta por cobrar';
      else if (settlementType === 'courtesy') paymentMethodLabel = 'Cortesía de la clínica';
      else if (settlementType === 'exchange') paymentMethodLabel = `Intercambio - ${paymentData.exchangeStaffName || ''}`;
      else if (paymentMode === 'mixed') paymentMethodLabel = `${methodUsd} + ${methodBs}`;
      else if (paymentMode === 'full_bs') paymentMethodLabel = methodBs;
      else paymentMethodLabel = methodUsd;

      // "Atendido por": los Odontólogos que hicieron los servicios (no el asistente dental).
      const barberNames = Array.from(new Set(totalAppsInCheckout.map(a => a.staff?.name).filter(Boolean))).join(', ');

      // Initialize Receipt
      const receiptData = {
        orderNumber,
        currency: receiptCurrency,
        rate: fixedRate,
        client: { name: paymentData.clientName },
        staff: { name: barberNames || paymentData.staffInvolved.map(s => s.name).join(', ') },
        items: [
          ...totalAppsInCheckout.map(app => ({
            name: app.services?.name || 'Servicio',
            price: (app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0)),
            quantity: 1
          })),
          ...paymentData.products.map(p => ({
            name: p.name,
            price: p.price,
            quantity: p.quantity
          })),
          ...paymentData.extras.map(e => ({
            name: e.service_extras?.name || 'Extra',
            price: e.price,
            quantity: 1
          }))
        ],
        paymentMethodLabel,
        reference: paymentData.paymentReferenceBs || '',
        subtotal: servicePrice + productsTotal + extrasTotal,
        discount: couponDiscount,
        tip: paymentData.totalTips,
        total: paymentData.totalUsd,
        change: 0,
        generated_at: new Date().toISOString()
      };

      setPrintTransaction(receiptData);
      triggerRocket();
      showToast("¡Venta completada con éxito!", "success");
      loadData();
    } catch (err) {
      console.error("Error en checkout:", err);
      showToast("Error al procesar pago", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSale = () => {
    setIsDirectSale(true);
    setSelectedApp(null);
    setSelectedClient(null);
    setDirectSaleIdSearch('');
    setCart([]);
    if (isMobile) setShowMobileCart(true);
    showToast("Venta Directa activada. Identifica al cliente si lo deseas.");
  };

  const handleAddService = (service) => {
    if (!selectedApp && !selectedClient) {
      showToast("Por favor, identifica al cliente primero en la barra superior.", "warning");
      return;
    }
    setSelectedServiceForBarber(service);
    setShowServiceModal(false);
    setShowBarberModal(true);
  };

  const handleConfirmServiceBarber = async (barberId) => {
    if (confirmServiceBarberRef.current) return;
    confirmServiceBarberRef.current = true;
    try {
      setLoading(true);
      setShowBarberModal(false);

      const clientId = selectedClient?.id || selectedApp?.client_id;
      if (!clientId) {
        showToast("Error: No hay cliente seleccionado", "error");
        return;
      }

      let newApp;

      // Caso "sin servicio": la orden ya existe pero el barbero olvidó asignarle el servicio
      // desde su panel, así que llegó a caja en $0. Al agregar el servicio aquí, RELLENAMOS
      // esa misma cita (como hace el panel de barbero) en vez de crear otra — si creáramos
      // una nueva, la de $0 quedaría colada y se cobraría duplicada.
      if (selectedApp && !selectedApp.service_id && !selectedApp.services?.name) {
        const addedPrice = parseUsdAmount(selectedServiceForBarber.price);
        await dataService.updateAppointment(selectedApp.id, {
          service_id: selectedServiceForBarber.id,
          staff_id: barberId,
          total_price: Number((Number(selectedApp.total_price || 0) + addedPrice).toFixed(2))
        });
        newApp = selectedApp;
        showToast("Servicio asignado a la orden existente.");
      } else {
        // Guard anti-duplicado: si ya existe una cita activa idéntica (mismo cliente +
        // servicio + barbero, aún sin cobrar), la reutilizamos en vez de crear otra. Evita
        // el doble servicio cuando el flujo de Venta Directa se repite por confusión.
        const activeNow = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
        const existingDupe = (activeNow || []).find(a =>
          String(a.client_id) === String(clientId) &&
          String(a.service_id) === String(selectedServiceForBarber.id) &&
          String(a.staff_id) === String(barberId)
        );

        if (existingDupe) {
          newApp = existingDupe;
          showToast("Ese servicio ya estaba en la lista — no se duplicó.", "info");
        } else {
          newApp = await dataService.createAppointment({
            client_id: clientId,
            service_id: selectedServiceForBarber.id,
            staff_id: barberId,
            status: 'En Silla',
            total_price: parseUsdAmount(selectedServiceForBarber.price)
          });

          // MIGRAR ITEMS EN CART (Extras o Productos) A LA NUEVA CITA
          if (!selectedApp && cart && cart.length > 0) {
            for (const item of cart) {
              if (item.type === 'extra') {
                const realExtraId = item.id.replace('extra_', '');
                await dataService.addExtraToAppointment(newApp.id, realExtraId, item.price);
              } else {
                await dataService.addProductToAppointment(newApp.id, item.id, item.quantity, item.price);
              }
            }
          }
        }
      }

      await loadData();
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      
      if (selectedApp) {
        const currentAppResel = updatedApps.find(a => a.id === selectedApp.id);
        if (currentAppResel) setSelectedApp(currentAppResel);
        showToast("Servicio añadido y odontólogo asignado.");
      } else {
        const fullyLoadedApp = updatedApps.find(a => a.id === newApp.id);
        if (fullyLoadedApp) {
          setIsDirectSale(false);
          setSelectedApp(fullyLoadedApp);
        } else {
          const barber = allStaff.find(s => s.id === barberId);
          const constructedApp = {
            ...newApp,
            clients: selectedClient || { name: 'Cliente', id_card: '' },
            services: selectedServiceForBarber,
            staff: barber || null,
            appointment_extras: [],
            appointment_products: [],
            appointment_staff: []
          };
          setIsDirectSale(false);
          setSelectedApp(constructedApp);
        }
        showToast("Servicio añadido y odontólogo asignado.");
      }
      setSelectedServiceForBarber(null);
    } catch (e) {
      console.error(e);
      showToast("Error al asignar odontólogo", "error");
    } finally {
      setLoading(false);
      confirmServiceBarberRef.current = false;
    }
  };

  const handleOpenChangeBarber = () => {
    if (!selectedApp) return;
    setIsChangingBarber(true);
    setShowBarberModal(true);
  };

  const handleOpenChangeBundledBarber = (app) => {
    setActiveAppForBarberChange(app);
    setIsChangingBarber(true);
    setShowBarberModal(true);
  };

  const handleChangeBarber = async (barberId) => {
    const appToChange = activeAppForBarberChange || selectedApp;
    if (!appToChange) return;

    try {
      setLoading(true);
      setShowBarberModal(false);
      setIsChangingBarber(false);
      setActiveAppForBarberChange(null);
      
      await dataService.updateAppointment(appToChange.id, { staff_id: barberId });
      showToast("Odontólogo actualizado correctamente");
      await loadData();
      
      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
      const updatedSelected = updatedApps.find(a => a.id === selectedApp.id);
      setSelectedApp(updatedSelected);
    } catch (e) {
      console.error(e);
      showToast("Error al cambiar de odontólogo", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBundledService = (app) => {
    if (!app) return;
    
    setDialog({
      isOpen: true,
      title: "Eliminar Servicio",
      message: `¿Seguro que deseas eliminar el servicio "${app.services?.name}" de esta cita?`,
      type: "confirm",
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        try {
          setLoading(true);
          
          await dataService.updateAppointment(app.id, {
            service_id: null,
            total_price: Number(Math.max(0, (app.total_price || 0) - (app.services?.price || 0)).toFixed(2))
          });
          
          showToast("Servicio eliminado de la cita.");
          await loadData();
          
          const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
          const currentAppResel = updatedApps.find(a => a.id === selectedApp.id);
          if (currentAppResel) {
            setSelectedApp(currentAppResel);
          } else {
            const nextApp = updatedApps.find(a => a.client_id === selectedApp.client_id);
            if (nextApp) {
              setSelectedApp(nextApp);
            } else {
              setSelectedApp(null);
            }
          }
        } catch (e) {
          console.error(e);
          showToast("Error al eliminar el servicio", "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDirectSaleSearchInput = (val) => {
    setDirectSaleIdSearch(val);
    if (val.length >= 1) {
      const term = normalizeForSearch(val);
      const results = allClients.filter(c => {
        const normalizedName = normalizeForSearch(c.name || '');
        const nameMatches = normalizedName.split(' ').some(w => w.startsWith(term));
        const idMatches = (c.id_card || '').toLowerCase().includes(term);
        return nameMatches || idMatches;
      });
      setDirectSaleSearchResults(results.slice(0, 5));
    } else {
      setDirectSaleSearchResults([]);
    }
  };

  const handleSelectDirectSaleClient = (client) => {
    setSelectedClient(client);
    setDirectSaleIdSearch('');
    setDirectSaleSearchResults([]);
    showToast(`Cliente enlazado: ${client.name}`);
  };

  const handleDirectSaleIdSearch = () => {
    if (directSaleSearchResults.length === 1) {
      handleSelectDirectSaleClient(directSaleSearchResults[0]);
    } else {
      const exact = allClients.find(c => c.id_card === directSaleIdSearch || c.name.toLowerCase() === directSaleIdSearch.toLowerCase());
      if (exact) {
        handleSelectDirectSaleClient(exact);
      } else if (directSaleSearchResults.length > 1) {
        showToast("Múltiples coincidencias. Selecciona uno de la lista.", "info");
      } else {
        showToast("Cliente no encontrado. ¿Es un cliente nuevo?", "warning");
      }
    }
  };

  const handleNewClientSuccess = (newClient) => {
    setAllClients([...allClients, newClient]);
    setSelectedClient(newClient);
    setShowNewClientModal(false);
    showToast(`¡Cliente ${newClient.name} registrado y enlazado!`);
  };

  // Group active services (status !== 'Agendado') by client
  const activeServices = pendingServices.filter(a => a.status !== 'Agendado');
  const groupedActiveServices = [];
  activeServices.forEach(app => {
    const existing = groupedActiveServices.find(g => g.client_id === app.client_id);
    if (existing) {
      existing.apps.push(app);
    } else {
      groupedActiveServices.push({
        client_id: app.client_id,
        client_name: app.clients?.name || 'Cliente',
        status: app.status,
        apps: [app]
      });
    }
  });

  // Group scheduled services (status === 'Agendado') by client
  const scheduledServices = pendingServices.filter(a => a.status === 'Agendado');
  const groupedScheduledServices = [];
  scheduledServices.forEach(app => {
    const existing = groupedScheduledServices.find(g => g.client_id === app.client_id);
    if (existing) {
      existing.apps.push(app);
    } else {
      groupedScheduledServices.push({
        client_id: app.client_id,
        client_name: app.clients?.name || 'Cliente',
        apps: [app]
      });
    }
  });

  if (!rates?.usd && !loading) {
    return (
      <div className="glass-card" style={{ padding: '40px' }}>
        <SkeletonList rows={3} rowHeight={48} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: isModalView ? '0px' : '100px', maxWidth: '100%' }}>
      {!isModalView && (
        <header style={{ marginBottom: isMobile ? '16px' : '40px', paddingRight: '48px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Caja <span className="text-gold">Pro</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Liquidación de servicios y venta de productos.</p>
          {pendingOfflineCount > 0 && (
            <button type="button" onClick={openOfflineModal} title="Ver detalle de los pagos pendientes" style={{ marginTop: '8px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(255, 149, 0, 0.15)', border: '1px solid rgba(255, 149, 0, 0.4)', color: '#ff9500', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <RefreshCcw size={12} /> {pendingOfflineCount} pago(s) pendientes offline
            </button>
          )}
        </header>
      )}

      <div className={isModalView ? "checkout-modal-wrapper" : "checkout-pos-container"} style={{ width: '100%' }}>
        <div className="checkout-pos-grid">
        
        {!isModalView && (
          <section style={{ minWidth: 0, width: '100%' }}>
          <div className="glass-card" style={{ marginBottom: isMobile ? '12px' : '32px', borderRadius: '24px', maxWidth: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Cola de Cobro</span>
              </div>
              <button 
                onClick={handleManualSale}
                style={{ 
                  padding: '8px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: '800',
                  background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                  border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)',
                  display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Plus size={14} /> VENTA DIRECTA
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
              <input 
                type="text" 
                placeholder="Buscar por cédula o nombre..." 
                value={idSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setIdSearch(val);
                  
                  const activeMatch = pendingServices.find(app => app.status !== 'Agendado' && app.clients?.id_card === val);
                  if (activeMatch) {
                    setSelectedApp(activeMatch);
                    return;
                  }

                  const scheduledMatch = pendingServices.find(app => app.status === 'Agendado' && app.clients?.id_card === val);
                  if (scheduledMatch) {
                    setDialog({
                      isOpen: true,
                      type: 'confirm',
                      title: 'Cita Encontrada',
                      message: `El cliente ${scheduledMatch.clients?.name} tiene una cita agendada para hoy. ¿Deseas iniciar su servicio ahora?`,
                      onConfirm: () => {
                        const clientApps = pendingServices.filter(app => app.client_id === scheduledMatch.client_id && app.status === 'Agendado');
                        handleStartGroupAppointments(clientApps);
                        setDialog({ ...dialog, isOpen: false });
                        setIdSearch('');
                      }
                    });
                  }
                }}
                style={{ width: '100%', paddingLeft: '48px', backgroundColor: 'rgba(255, 255, 255,0.05)', border: '1px solid rgba(255, 255, 255,0.2)', height: '48px', borderRadius: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <TrendingUp size={16} color="var(--text-muted)" />
              <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Lista de Espera por Cobrar</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groupedActiveServices.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes por cobrar.</div>
              ) : (
                groupedActiveServices.map(group => {
                  const isSelected = selectedApp?.client_id === group.client_id;
                  const badgeStatus = group.apps.some(a => a.status === 'En Silla') ? 'En Silla' : (group.apps.some(a => a.status === 'En Lavado') ? 'En Lavado' : 'Por Pagar');
                  const serviceNames = (() => {
                    const names = group.apps.map(a => a.services?.name).filter(Boolean);
                    if (names.length > 0) return names.join(' + ');
                    const hasExtras = group.apps.some(a => (a.appointment_extras?.length || 0) > 0);
                    if (hasExtras) return 'Extras';
                    const hasProducts = group.apps.some(a => (a.appointment_products?.length || 0) > 0);
                    if (hasProducts) return 'Venta de Productos';
                    return 'Sin servicio asignado';
                  })();
                  const staffNames = Array.from(new Set(group.apps.map(a => a.staff?.name?.split(' ')[0]).filter(Boolean))).join(', ') || 'Caja';
                  const totalUsd = group.apps.reduce((acc, a) => acc + (a.total_price !== undefined && a.total_price !== null && Number(a.total_price) > 0 ? Number(a.total_price) : (a.services?.price || 0)), 0);
                  
                  return (
                    <div 
                      key={group.client_id} 
                      onClick={() => setSelectedApp(group.apps[0])}
                      className="glass-card"
                      style={{ 
                        padding: '16px', 
                        border: isSelected ? '1px solid var(--gold-primary)' : undefined,
                        background: isSelected ? 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)' : undefined,
                        boxShadow: isSelected ? '0 8px 24px rgba(17, 17, 17,0.15)' : undefined,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '800', fontSize: '14px', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%', display: 'block' }}>{group.client_name}</span>
                        <span style={{ 
                          fontSize: '9px', 
                          backgroundColor: badgeStatus === 'En Silla' 
                            ? 'rgba(17, 17, 17, 0.12)' 
                            : (badgeStatus === 'En Lavado' ? 'rgba(0, 122, 255, 0.12)' : 'rgba(48, 209, 88, 0.12)'), 
                          color: badgeStatus === 'En Silla' 
                            ? 'var(--gold-primary)' 
                            : (badgeStatus === 'En Lavado' ? '#007aff' : '#30d158'), 
                          border: badgeStatus === 'En Silla'
                            ? '1px solid rgba(17, 17, 17, 0.25)'
                            : (badgeStatus === 'En Lavado' ? '1px solid rgba(0, 122, 255, 0.25)' : '1px solid rgba(48, 209, 88, 0.25)'),
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>{badgeStatus === 'En Silla' ? 'En sillón' : badgeStatus === 'En Lavado' ? 'En profilaxis' : badgeStatus}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '70%', minWidth: 0 }}>
                          <Scissors size={12} style={{ flexShrink: 0 }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0 }}>{serviceNames}</span> <span style={{ flexShrink: 0 }}>•</span> <span style={{ fontWeight: '600', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{staffNames}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--gold-primary)' }}>{(totalUsd * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ref: ${Number(totalUsd).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '16px', letterSpacing: '1px' }}>PRÓXIMAS CITAS (AGENDA HOY)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedScheduledServices.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.1)', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>No hay más citas para hoy</div>
                ) : (
                  groupedScheduledServices.map(group => {
                    const firstApp = group.apps[0];
                    const serviceNames = (() => {
                      const names = group.apps.map(a => a.services?.name).filter(Boolean);
                      if (names.length > 0) return names.join(' + ');
                      const hasExtras = group.apps.some(a => (a.appointment_extras?.length || 0) > 0);
                      if (hasExtras) return 'Extras';
                      const hasProducts = group.apps.some(a => (a.appointment_products?.length || 0) > 0);
                      if (hasProducts) return 'Venta de Productos';
                      return 'Sin servicio asignado';
                    })();
                    const staffNames = Array.from(new Set(group.apps.map(a => a.staff?.name?.split(' ')[0]).filter(Boolean))).join(', ') || 'Caja';
                    const timeString = new Date(firstApp.scheduled_at || firstApp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    
                    return (
                      <div 
                        key={group.client_id} 
                        className="glass-card"
                        style={{ 
                          padding: '16px', 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          position: 'relative',
                          transition: 'none'
                        }}
                      >
                        <div style={{ maxWidth: '70%', minWidth: 0 }}>
                          <div style={{ fontWeight: '800', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{group.client_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {timeString} • {serviceNames} • {staffNames}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            handleStartGroupAppointments(group.apps);
                            triggerRocket();
                          }}
                          style={{ 
                            padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '800',
                            background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                            border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(17, 17, 17,0.1)'
                          }}
                        >
                          Iniciar
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {(selectedApp || isDirectSale) && (
            <div className="animate-slide-up" style={{ display: 'flex', gap: isMobile ? '12px' : '16px', width: '100%', boxSizing: 'border-box', marginTop: '10px' }}>
              
              <button 
                onClick={() => setShowProductModal(true)}
                style={{ flex: 1, padding: isMobile ? '18px 8px' : '24px', borderRadius: isMobile ? '18px' : '24px', border: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onPointerCancel={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <ShoppingBag size={isMobile ? 22 : 28} color="var(--gold-primary)" strokeWidth={1.5} />
                <span style={{ fontWeight: '700', fontSize: isMobile ? '9px' : '11px', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.7)' }}>PRODUCTOS</span>
              </button>

              <button 
                onClick={() => setShowExtraModal(true)}
                style={{ flex: 1, padding: isMobile ? '18px 8px' : '24px', borderRadius: isMobile ? '18px' : '24px', border: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onPointerCancel={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Zap size={isMobile ? 22 : 28} color="var(--gold-primary)" strokeWidth={1.5} />
                <span style={{ fontWeight: '700', fontSize: isMobile ? '9px' : '11px', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.7)' }}>EXTRAS</span>
              </button>

              <button 
                onClick={() => setShowServiceModal(true)}
                style={{ flex: 1, padding: isMobile ? '18px 8px' : '24px', borderRadius: isMobile ? '18px' : '24px', border: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onPointerCancel={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Scissors size={isMobile ? 22 : 28} color="var(--gold-primary)" strokeWidth={1.5} style={{ transform: 'rotate(-45deg)' }} />
                <span style={{ fontWeight: '700', fontSize: isMobile ? '9px' : '11px', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.7)' }}>SERVICIOS</span>
              </button>

            </div>
          )}
        </section>
        )}
        <CartWrapper isMobile={isMobile} showMobileCart={showMobileCart} onClose={() => setShowMobileCart(false)} isModalView={isModalView}>
          {(!selectedApp && !isDirectSale) ? (
            <div className="glass-card" style={{ borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <BarChart3 size={20} color="var(--gold-primary)" />
                <span style={{ fontWeight: '800', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>Resumen del Día</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(17, 17, 17,0.08)', border: '1px solid rgba(17, 17, 17,0.15)', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--gold-primary)' }}>{groupedActiveServices.length}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', marginTop: '4px' }}>POR COBRAR</div>
                </div>
                <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'white' }}>{groupedScheduledServices.length}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', marginTop: '4px' }}>EN COLA</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(17, 17, 17,0.05)', border: '1px solid rgba(17, 17, 17,0.1)' }}>
                <User size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Selecciona un cliente de la cola para iniciar el cobro</span>
              </div>
            </div>
          ) : (
            <div className="glass-card animate-scale-in" style={{ borderRadius: isMobile ? '16px' : '24px', padding: isMobile ? '12px 14px' : '16px 20px', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: isMobile ? '8px' : '0', marginBottom: isMobile ? '10px' : '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', margin: 0 }}>{selectedApp ? 'Resumen de Cobro' : 'Venta Directa'}</h3>
                    {(selectedApp || isDirectSale) && (
                      <button
                        type="button"
                        onClick={() => setPreviewReceipt(buildPreviewReceipt())}
                        title="Ver vista previa de la factura"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '999px', border: '1px solid rgba(17, 17, 17,.3)', background: 'rgba(17, 17, 17,.08)', color: 'var(--gold-primary)', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        <Eye size={13} /> Ver factura
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', fontSize: '12px', fontWeight: '700' }}>
                    {selectedApp ? (
                      <>
                        {selectedApp.clients.name} 
                        {bundledApps.length > 0 && bundledApps.map(a => a.services?.name).filter(Boolean).length > 0 ? (
                          ` • ${bundledApps.map(a => a.services?.name).filter(Boolean).join(' + ')}`
                        ) : ''}
                      </>
                    ) : (
                      <>
                        {selectedClient ? (
                          <div className="animate-scale-in" style={{ padding: '12px 16px', background: 'rgba(255, 255, 255,0.1)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: '800', fontSize: isMobile ? '14px' : '16px' }}>{selectedClient.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{selectedClient.id_card}</div>
                            </div>
                            <button onClick={() => setSelectedClient(null)} style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }}>CAMBIAR</button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                <Search style={{ position: 'absolute', left: '10px', top: '12px' }} size={14} color="var(--text-muted)" />
                                <input 
                                  type="text" 
                                  placeholder={isMobile ? 'Cédula o nombre...' : 'Cédula o nombre del cliente...'} 
                                  value={directSaleIdSearch}
                                  onChange={(e) => handleDirectSaleSearchInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleDirectSaleIdSearch()}
                                  style={{ width: '100%', paddingLeft: '34px', height: '40px', fontSize: isMobile ? '12px' : '13px', boxSizing: 'border-box' }}
                                />
                              </div>
                              <button 
                                onClick={handleDirectSaleIdSearch} 
                                style={{ 
                                  padding: '0 16px', height: '40px', flexShrink: 0, fontSize: isMobile ? '10px' : '12px', fontWeight: '800',
                                  background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                                  border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)', borderRadius: '10px', cursor: 'pointer'
                                }}
                              >
                                {isMobile ? 'OK' : 'ENLAZAR'}
                              </button>
                              <button 
                                onClick={() => setShowNewClientModal(true)} 
                                style={{ padding: '0 10px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
                              >
                                <UserPlus size={16} />
                              </button>
                            </div>
                            
                            {/* Autocomplete Dropdown */}
                            {directSaleSearchResults.length > 0 && (
                              <div className="animate-scale-in" style={{ 
                                position: 'absolute', top: '100%', left: 0, right: 0, 
                                marginTop: '8px', background: 'var(--bg-secondary)', 
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                                overflow: 'hidden', zIndex: 10, backdropFilter: 'blur(10px)',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                              }}>
                                {directSaleSearchResults.map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => handleSelectDirectSaleClient(c)}
                                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'white' }}>{c.name}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>V-{c.id_card}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: isMobile ? 'left' : 'right', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '8px', flexShrink: 0 }}>
                  <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', whiteSpace: 'nowrap' }}>TASA MANUAL ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={fixedRate} 
                    onChange={(e) => setFixedRate(e.target.value)}
                    onBlur={() => {
                      if (fixedRate) {
                        setFixedRate(Number(Number(fixedRate).toFixed(2)));
                      }
                    }}
                    style={{ width: isMobile ? '90px' : '100px', textAlign: 'right', fontWeight: '900', color: 'var(--gold-primary)', background: 'none', border: '1px solid rgba(255, 255, 255,0.3)', marginLeft: isMobile ? '0' : '10px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px', marginBottom: '10px', padding: isMobile ? '8px 10px' : '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '14px' }}>
                {totalAppsInCheckout.map(app => {
                  const sPrice = app.total_price !== undefined && app.total_price !== null && Number(app.total_price) > 0 ? Number(app.total_price) : (app.services?.price || 0);
                  const isLinked = app.client_id !== selectedApp?.client_id;
                  return (
                    <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                        {isLinked ? (
                          <button 
                            onClick={() => handleUnlinkApp(app.id)} 
                            style={{ background: 'rgba(255,149,0,0.15)', border: 'none', color: '#ff9500', cursor: 'pointer', padding: isMobile ? '8px' : '4px', display: 'inline-flex', alignItems: 'center', flexShrink: 0, borderRadius: '50%', margin: isMobile ? '-4px' : '0' }}
                            title="Desenlazar cita"
                          >
                            <XCircle size={14} style={{ opacity: 0.9 }} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRemoveBundledService(app)} 
                            style={{ background: 'rgba(255,69,58,0.15)', border: 'none', color: '#ff453a', cursor: 'pointer', padding: isMobile ? '8px' : '4px', display: 'inline-flex', alignItems: 'center', flexShrink: 0, borderRadius: '50%', margin: isMobile ? '-4px' : '0' }}
                            title={app.services ? "Eliminar servicio" : "Eliminar extras"}
                          >
                            <XCircle size={14} style={{ opacity: 0.9 }} />
                          </button>
                        )}
                        {isLinked && <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontSize: '10px', flexShrink: 0 }}>({app.clients?.name?.split(' ')[0]}):</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)' }}>
                          {app.services ? `Servicio: ${app.services.name}` : ((app.appointment_extras?.length || 0) > 0 ? 'Extras' : ((app.appointment_products?.length || 0) > 0 ? 'Productos' : 'Sin servicio asignado'))}
                        </span>
                        {' • '}
                        <span 
                          onClick={() => handleOpenChangeBundledBarber(app)}
                          style={{ 
                            color: 'var(--gold-primary)', 
                            fontWeight: '800', 
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: isMobile ? '12px' : '11px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(17, 17, 17,0.1)',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}
                          title="Click para cambiar odontólogo"
                        >
                          {app.staff?.name?.split(' ')[0] || 'Caja'}
                          <Edit3 size={12} />
                        </span>
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px', flexShrink: 0 }}>
                        {app.services ? (
                          <>
                            {editingAppPrice?.id === app.id ? (
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800' }}>Bs.</span>
                                <input 
                                  type="number"
                                  autoFocus
                                  defaultValue={(sPrice * fixedRate).toFixed(2)}
                                  onBlur={async (e) => {
                                    const val = e.target.value;
                                    const newPriceBs = parseFloat(val) || 0;
                                    const newPriceUsd = fixedRate > 0 ? (newPriceBs / fixedRate) : 0;
                                    if (newPriceUsd > 0 && newPriceUsd < MIN_PLAUSIBLE_SERVICE_USD) {
                                      showToast(`Ese monto equivale a $${newPriceUsd.toFixed(4)} — el campo es en bolívares, no en dólares. Revisa la cifra.`, "warning");
                                      setEditingAppPrice(null);
                                      return;
                                    }
                                    try {
                                      setLoading(true);
                                      await dataService.updateAppointment(app.id, { total_price: newPriceUsd });
                                      showToast("Precio del servicio actualizado");
                                      await loadData();
                                      const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
                                      const updatedSelected = updatedApps.find(a => a.id === selectedApp?.id);
                                      if (updatedSelected) setSelectedApp(updatedSelected);
                                    } catch (err) {
                                      console.error(err);
                                      showToast("Error al actualizar precio", "error");
                                    } finally {
                                      setLoading(false);
                                      setEditingAppPrice(null);
                                    }
                                  }}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      const val = e.target.value;
                                      const newPriceBs = parseFloat(val) || 0;
                                      const newPriceUsd = fixedRate > 0 ? (newPriceBs / fixedRate) : 0;
                                      if (newPriceUsd > 0 && newPriceUsd < MIN_PLAUSIBLE_SERVICE_USD) {
                                        showToast(`Ese monto equivale a $${newPriceUsd.toFixed(4)} — el campo es en bolívares, no en dólares. Revisa la cifra.`, "warning");
                                        setEditingAppPrice(null);
                                        return;
                                      }
                                      try {
                                        setLoading(true);
                                        await dataService.updateAppointment(app.id, { total_price: newPriceUsd });
                                        showToast("Precio del servicio actualizado");
                                        await loadData();
                                        const updatedApps = await dataService.getAppointmentsByState(['En Silla', 'Por Pagar', 'Agendado', 'En Lavado']);
                                        const updatedSelected = updatedApps.find(a => a.id === selectedApp?.id);
                                        if (updatedSelected) setSelectedApp(updatedSelected);
                                      } catch (err) {
                                        console.error(err);
                                        showToast("Error al actualizar precio", "error");
                                      } finally {
                                        setLoading(false);
                                        setEditingAppPrice(null);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setEditingAppPrice(null);
                                    }
                                  }}
                                  style={{ width: isMobile ? '110px' : '95px', height: isMobile ? '44px' : '28px', background: 'var(--bg-secondary)', border: '1px solid var(--gold-primary)', borderRadius: '6px', color: 'white', paddingLeft: '28px', paddingRight: '6px', fontSize: '12px', fontWeight: '800', textAlign: 'right', outline: 'none' }}
                                />
                              </div>
                            ) : (
                              <div 
                                onClick={() => setEditingAppPrice(app)}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', transition: 'all 0.2s' }}
                                onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                                  <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px', color: 'white' }}>
                                    {isMobile ? `${Math.round(sPrice * fixedRate).toLocaleString('es-VE')} Bs.` : `${(sPrice * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}
                                  </span>
                                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: ${Number(sPrice).toFixed(2)}</span>
                                </div>
                                <Edit3 size={12} color="var(--gold-primary)" style={{ opacity: 0.8 }} />
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Monto en extras</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {selectedApp && (
                  <button 
                    onClick={() => setShowLinkModal(true)}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '10px', 
                      border: '1px dashed var(--gold-primary)', 
                      background: 'rgba(255, 255, 255,0.05)', 
                      color: 'var(--gold-primary)', 
                      fontWeight: '800', 
                      fontSize: '10px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: '2px',
                      marginBottom: '4px'
                    }}
                  >
                    <Link2 size={12} /> ENLAZAR OTRAS CITAS (PAGO GRUPAL)
                  </button>
                )}
                 {cart.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                      <button onClick={() => handleRemoveProduct(p)} style={{ background: 'rgba(255,69,58,0.15)', border: 'none', color: '#ff453a', cursor: 'pointer', padding: isMobile ? '8px' : '4px', display: 'inline-flex', alignItems: 'center', flexShrink: 0, borderRadius: '50%', margin: isMobile ? '-4px' : '0' }}>
                        <XCircle size={14} style={{ opacity: 0.9 }} />
                      </button>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.9)' }}>{p.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '4px', flexShrink: 0 }}>
                        <button 
                          onClick={() => handleDecrementProduct(p)}
                          style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                          <Minus size={8} />
                        </button>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: 'white', minWidth: '10px', textAlign: 'center' }}>{p.quantity}</span>
                        <button 
                          onClick={() => handleIncrementProduct(p)}
                          style={{ background: 'none', border: 'none', color: 'var(--gold-primary)', cursor: 'pointer', padding: '1px', display: 'flex', alignItems: 'center' }}
                        >
                          <Plus size={8} />
                        </button>
                      </div>
                      
                      {/* Staff Selector for Product Sale */}
                      <CartSellerSelect
                        value={itemSalesAssociations[p.id] || ''}
                        onChange={(val) => setItemSalesAssociations({ ...itemSalesAssociations, [p.id]: val })}
                        options={allStaff.filter(s => !(s.role || '').toLowerCase().includes('admin')).map(s => ({ value: s.id, label: s.name?.split(' ')[0], imageUrl: s.image_url || s.avatar_url || '', avatarFallback: (s.name || '?').trim().charAt(0).toUpperCase(), subtitle: (s.role || 'Profesional').split('|')[0] }))}
                      />
                    </span>
                    {editingProductId === p.id ? (
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800' }}>Bs.</span>
                        <input
                          type="number"
                          autoFocus
                          defaultValue={(p.price * p.quantity * fixedRate).toFixed(2)}
                          onBlur={(e) => handleUpdateProductPrice(p, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateProductPrice(p, e.target.value)}
                          style={{ width: isMobile ? '110px' : '95px', height: isMobile ? '44px' : '28px', background: 'var(--bg-secondary)', border: '1px solid var(--gold-primary)', borderRadius: '6px', color: 'white', paddingLeft: '28px', paddingRight: '6px', fontSize: '12px', fontWeight: '800', textAlign: 'right', outline: 'none' }}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingProductId(p.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', flexShrink: 0, transition: 'all 0.2s' }}
                        onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                          <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px', color: 'white' }}>
                            {isMobile ? `${Math.round(p.price * p.quantity * fixedRate).toLocaleString('es-VE')} Bs.` : `${(p.price * p.quantity * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: ${(p.price * p.quantity).toFixed(2)}</span>
                        </div>
                        <Edit3 size={12} color="var(--gold-primary)" style={{ opacity: 0.8 }} />
                      </div>
                    )}
                  </div>
                ))}
 
                {totalAppsInCheckout.flatMap(app => 
                  app.appointment_extras?.map(extra => ({
                    ...extra,
                    appId: app.id
                  })) || []
                ).map(extra => (
                  <div key={extra.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gold-primary)', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: isMobile ? '11px' : '13px', flex: 1, minWidth: 0 }}>
                      <button onClick={() => handleRemoveExtra(extra.id)} style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                        <XCircle size={isMobile ? 12 : 14} style={{ opacity: 0.8 }} />
                      </button>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gold-primary)' }}>{extra.service_extras?.name}</span>
                      
                      {/* Staff Selector for Extra */}
                      <CartSellerSelect
                        value={itemSalesAssociations[extra.id] || ''}
                        onChange={(val) => setItemSalesAssociations({ ...itemSalesAssociations, [extra.id]: val })}
                        options={allStaff.filter(s => !(s.role || '').toLowerCase().includes('admin')).map(s => ({ value: s.id, label: s.name?.split(' ')[0], imageUrl: s.image_url || s.avatar_url || '', avatarFallback: (s.name || '?').trim().charAt(0).toUpperCase(), subtitle: (s.role || 'Profesional').split('|')[0] }))}
                      />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      {editingExtraPriceId === extra.id ? (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--gold-primary)', fontWeight: '800' }}>Bs.</span>
                          <input 
                            type="number"
                            autoFocus
                            defaultValue={(extra.price * fixedRate).toFixed(2)}
                            onBlur={(e) => handleUpdateExtraPrice(extra.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateExtraPrice(extra.id, e.target.value)}
                            style={{ width: isMobile ? '110px' : '95px', height: isMobile ? '44px' : '28px', background: 'var(--bg-secondary)', border: '1px solid var(--gold-primary)', borderRadius: '6px', color: 'white', paddingLeft: '28px', paddingRight: '6px', fontSize: '12px', fontWeight: '800', textAlign: 'right', outline: 'none' }}
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => setEditingExtraPriceId(extra.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 6px', borderRadius: '6px', transition: 'all 0.2s' }}
                          onMouseOver={(ev) => ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                          onMouseOut={(ev) => ev.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0px' }}>
                            <span style={{ fontWeight: '800', fontSize: isMobile ? '12px' : '14px' }}>
                              {isMobile ? `${Math.round(extra.price * fixedRate).toLocaleString('es-VE')} Bs.` : `${(extra.price * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.`}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Ref: ${Number(extra.price).toFixed(2)}</span>
                          </div>
                          <Edit3 size={12} color="var(--gold-primary)" style={{ opacity: 0.8 }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Washing Section */}
                {washEligibleCount > 0 && (
                  <div style={{ padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: '12px', marginTop: '6px', marginBottom: '6px', border: '1px solid rgba(10,132,255,0.25)', background: 'rgba(10,132,255,0.06)' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '6px', marginBottom: isMobile ? '6px' : '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(10,132,255,0.1)', color: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Droplets size={14} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'white', margin: 0 }}>Limpiezas</h4>
                          <p style={{ fontSize: '9px', color: 'var(--text-secondary)', margin: 0 }}>Selecciona la cantidad de limpiezas.</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
                        {Array.from({ length: washEligibleCount + 1 }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => { userSetWashCountRef.current = true; setWashCount(idx); }}
                            style={{
                              padding: isMobile ? '4px 8px' : '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: washCount === idx ? '#0a84ff' : 'rgba(255,255,255,0.05)',
                              color: washCount === idx ? 'white' : 'var(--text-muted)',
                              fontWeight: '900',
                              fontSize: isMobile ? '10px' : '12px',
                              cursor: 'pointer',
                              transition: '0.2s',
                              flex: isMobile ? 1 : 'none'
                            }}
                          >
                            {idx} {idx === 1 ? 'limpieza' : 'limpiezas'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {washCount > 0 && (
                      <div className="animate-fade-in" style={{ position: 'relative' }}>
                        {/* Selected value button */}
                        <div 
                          ref={washerTriggerRef}
                          onClick={() => setIsWasherDropdownOpen(!isWasherDropdownOpen)}
                          style={{
                            width: '100%',
                            padding: isMobile ? '10px 12px' : '14px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: 'white',
                            fontSize: isMobile ? '12px' : '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.6)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.25)'}
                        >
                          <span>
                            {selectedWasherId 
                              ? (() => {
                                  const washer = allStaff.find(s => s.id === selectedWasherId);
                                  return washer ? `${washer.name} ($${getWashingRate(washer)}/profilaxis) - Disponible` : 'Seleccionar Asistente dental';
                                })()
                              : 'Seleccionar Asistente dental'
                            }
                          </span>
                          <ChevronDown size={16} color="var(--gold-primary)" style={{
                            transform: isWasherDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            flexShrink: 0
                          }} />
                        </div>

                        {/* Custom Dropdown Menu via Portal */}
                        <PortaledDropdown
                          isOpen={isWasherDropdownOpen}
                          onClose={() => setIsWasherDropdownOpen(false)}
                          triggerRef={washerTriggerRef}
                        >
                          <div
                            onClick={() => {
                              setSelectedWasherId('');
                              setIsWasherDropdownOpen(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              fontSize: isMobile ? '12px' : '14px',
                              color: 'rgba(255, 255, 255, 0.5)',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            Seleccionar Asistente dental
                          </div>
                          
                          {allStaff
                            .filter(s => s.role?.toLowerCase().includes('asistente'))
                            .map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setSelectedWasherId(s.id);
                                  setIsWasherDropdownOpen(false);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  fontSize: isMobile ? '12px' : '14px',
                                  color: 'white',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'background-color 0.2s',
                                  backgroundColor: selectedWasherId === s.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedWasherId === s.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}
                              >
                                <span style={{ fontWeight: selectedWasherId === s.id ? '800' : '500' }}>{s.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--gold-primary)' }}>${getWashingRate(s)}/profilaxis</span>
                              </div>
                            ))
                          }
                        </PortaledDropdown>
                        {allStaff.filter(s => s.role?.toLowerCase().includes('asistente')).length > 1 && !selectedWasherId && (
                          <div style={{ marginTop: '6px', fontSize: '9px', color: '#ff9500', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={11} /> Hay múltiples asistentes. Por favor selecciona una.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Dynamic Tips Section */}
                <div style={{ paddingTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.1)', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800' }}>
                      <TrendingUp size={12} color="var(--gold-primary)" /> PROPINAS
                    </span>
                    <button 
                      onClick={() => setTips([...tips, { id: Date.now().toString(), staffId: allStaff[0]?.id || '', amount: 0, currency: 'USD' }])}
                      style={{ background: 'rgba(255, 255, 255,0.1)', border: 'none', color: 'var(--gold-primary)', borderRadius: '8px', padding: '4px 8px', fontSize: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={12} /> AGREGAR PROPINA
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tips.map((t, idx) => (
                       <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative', width: '100%' }} className="animate-fade-in">
                        {/* Custom Dropdown Trigger */}
                        <div style={{ flex: 1, position: 'relative' }}>
                          <div
                            ref={el => { tipTriggerRefs.current[t.id] = el; }}
                            onClick={() => setOpenTipDropdownId(openTipDropdownId === t.id ? null : t.id)}
                            style={{
                              height: '36px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '10px',
                              fontSize: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: 'white',
                              padding: '0 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none',
                              boxSizing: 'border-box'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255,0.4)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                          >
                            <span>
                              {t.staffId 
                                ? allStaff.find(s => s.id === t.staffId)?.name || 'Seleccionar Integrante'
                                : 'Seleccionar Integrante'
                              }
                            </span>
                            <ChevronDown size={14} color="var(--gold-primary)" style={{
                              transform: openTipDropdownId === t.id ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              flexShrink: 0
                            }} />
                          </div>

                          {/* Custom Dropdown Menu via Portal */}
                          <PortaledDropdown
                            isOpen={openTipDropdownId === t.id}
                            onClose={() => setOpenTipDropdownId(null)}
                            triggerRef={{ current: tipTriggerRefs.current[t.id] }}
                            menuStyle={{ borderRadius: '12px' }}
                          >
                            <div
                              onClick={() => {
                                const newTips = [...tips];
                                newTips[idx].staffId = '';
                                setTips(newTips);
                                setOpenTipDropdownId(null);
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: 'rgba(255, 255, 255, 0.5)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              Seleccionar Integrante
                            </div>
                            {allStaff.filter(s => !(s.role || '').toLowerCase().includes('admin')).map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  const newTips = [...tips];
                                  newTips[idx].staffId = s.id;
                                  setTips(newTips);
                                  setOpenTipDropdownId(null);
                                }}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  color: 'white',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                  transition: 'background-color 0.2s',
                                  backgroundColor: t.staffId === s.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = t.staffId === s.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}
                              >
                                {s.name}
                              </div>
                            ))}
                          </PortaledDropdown>
                        </div>
                        
                        {/* Currency Selector (USD/BS Toggle) */}
                        <button
                          type="button"
                          onClick={() => {
                            const newTips = [...tips];
                            newTips[idx].currency = newTips[idx].currency === 'BS' ? 'USD' : 'BS';
                            setTips(newTips);
                          }}
                          style={{ 
                            width: '44px', 
                            height: '36px', 
                            background: t.currency === 'BS' ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255,0.15)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '10px', 
                            color: t.currency === 'BS' ? '#ffffff' : 'var(--gold-primary)', 
                            fontWeight: '900', 
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {t.currency === 'BS' ? 'Bs' : '$'}
                        </button>
                        
                        <div style={{ position: 'relative', width: '80px' }}>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={t.amount || ''} 
                            onChange={(e) => {
                              const newTips = [...tips];
                              newTips[idx].amount = parseFloat(e.target.value) || 0;
                              setTips(newTips);
                            }}
                            style={{ width: '100%', height: '36px', textAlign: 'right', background: 'rgba(255, 255, 255,0.1)', border: 'none', borderRadius: '10px', color: 'var(--gold-primary)', fontWeight: '800', paddingRight: '12px' }} 
                          />
                        </div>
                        <button 
                          onClick={() => setTips(tips.filter(item => item.id !== t.id))}
                          style={{ background: 'rgba(255,69,58,0.15)', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={16} style={{ opacity: 0.9 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                
                {/* WhatsApp Reminder Section */}
                {selectedApp && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}><Bell size={12} /> Recordatorio para su siguiente visita</span>
                    </div>
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { value: '1_week', label: '1 Semana' },
                          { value: '14_days', label: '14 Días' },
                          { value: '1_month', label: '1 Mes' },
                          { value: 'custom', label: 'Personalizado' }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setReminderPreset(opt.value)}
                            style={{
                              flex: 1,
                              padding: isMobile ? '12px 10px' : '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid',
                              borderColor: reminderPreset === opt.value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.1)',
                              background: reminderPreset === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                              color: reminderPreset === opt.value ? 'var(--gold-primary)' : 'var(--text-muted)',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {reminderPreset === 'custom' && (
                        <div style={{ marginTop: '4px' }}>
                          <PandaDatePicker
                            value={reminderDate}
                            onChange={setReminderDate}
                            placeholder="Seleccionar fecha del recordatorio"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Coupon Section */}
                {selectedApp && (
                  <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--gold-primary)', marginBottom: '4px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}><Gift size={12} /> CANJEAR CUPÓN DE REGALO</div>
                    
                    {!activeCoupon ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {clientCoupons.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {clientCoupons.map(c => (
                              <button 
                                key={c.id}
                                onClick={() => {
                                  setActiveCoupon(c);
                                  showToast(`Cupón válido: ${c.prize_name}`, "success");
                                  const wRate = getWashingRate(allStaff.find(s => s.id === selectedWasherId));
                                  const discount = calculateCouponDiscount(c, totalAppsInCheckout, washCount, wRate);
                                  setCouponDiscount(discount);
                                }}
                                style={{
                                  flex: '1 1 calc(50% - 4px)',
                                  padding: '8px',
                                  background: 'rgba(255, 215, 0, 0.1)',
                                  border: '1px solid var(--gold-primary)',
                                  borderRadius: '8px',
                                  color: 'var(--gold-primary)',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '4px',
                                  textAlign: 'left'
                                }}
                              >
                                <span>{c.prize_name}</span>
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Click para canjear</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                            No hay cupones disponibles para este cliente.
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input 
                            type="text" 
                            placeholder="O ingresa código manual..."
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            style={{ flex: 1, height: '36px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', paddingLeft: '8px' }}
                          />
                          <button 
                            onClick={async () => {
                              if (!couponCode) return;
                              try {
                                setLoading(true);
                                const coupons = await dataService.getCoupons();
                                const code = couponCode.trim().toUpperCase();
                                const found = coupons.find(c => c.id?.substring(0, 8).toUpperCase() === code || c.id === couponCode.trim());
                                if (!found) { showToast("Cupón no encontrado", "error"); return; }
                                if (found.status === 'USED') { showToast("El cupón ya ha sido utilizado", "warning"); return; }
                                setActiveCoupon(found);
                                showToast(`Cupón válido: ${found.prize_name}`, "success");
                                const wRate = getWashingRate(allStaff.find(s => s.id === selectedWasherId));
                                const discount = calculateCouponDiscount(found, totalAppsInCheckout, washCount, wRate);
                                setCouponDiscount(discount);
                              } catch (err) {
                                console.error(err);
                                showToast("Error al validar cupón", "error");
                              } finally {
                                setLoading(false);
                              }
                            }}
                            style={{ 
                              height: '36px', padding: '0 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer',
                              background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                              border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)'
                            }}
                          >
                            VALIDAR
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(50, 215, 75, 0.1)', border: '1px solid rgba(50, 215, 75, 0.3)', padding: '8px 12px', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#32d74b', display: 'flex', alignItems: 'center', gap: '5px' }}>{activeCoupon.prize_name} <Check size={13} /> Aplicado</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Descuento: -${couponDiscount.toFixed(2)}</div>
                        </div>
                        <button 
                          onClick={() => { setActiveCoupon(null); setCouponDiscount(0); setCouponCode(''); }}
                          style={{ background: 'none', border: 'none', color: '#ff453a', fontWeight: '950', fontSize: '16px', cursor: 'pointer' }}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </div>
                )}

<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                  <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '900' }}>TOTAL A PAGAR</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '950', color: 'var(--gold-primary)' }}>{formatCurrency(totalBs)} Bs.</div>
                    <div style={{ fontSize: isMobile ? '10px' : '11px', color: 'var(--text-muted)' }}>Ref: ${formatCurrency(totalUsd)}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>MODALIDAD DEL SERVICIO</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '5px', marginBottom: '8px' }}>
                  {[
                    { value: 'paid', label: 'PAGADO' },
                    { value: 'receivable', label: 'FIADO' },
                    { value: 'courtesy', label: 'CORTESÍA' },
                    { value: 'exchange', label: 'INTERCAMBIO' }
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSettlementType(option.value);
                        if (option.value === 'exchange' && !exchangeStaffId) {
                          setExchangeStaffId(totalAppsInCheckout.find(app => app.staff_id)?.staff_id || '');
                        }
                      }}
                      style={{ 
                        height: isMobile ? '46px' : '40px', borderRadius: '10px', 
                        border: settlementType === option.value ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                        background: settlementType === option.value ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                        color: settlementType === option.value ? 'var(--gold-primary)' : 'var(--text-muted)', 
                        fontSize: '10px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: settlementType === option.value ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                      }}
                    >{option.label}</button>
                  ))}
                </div>

                {settlementType === 'exchange' && (
                  <div style={{ padding: '13px', borderRadius: '12px', background: 'rgba(255,159,10,.08)', border: '1px solid rgba(255,159,10,.3)', marginBottom: '14px' }}>
                    <PandaSelect
                      label="Odontólogo responsable del intercambio"
                      value={exchangeStaffId}
                      onChange={setExchangeStaffId}
                      options={allStaff.filter(member => {
                        const role = String(member.role || '').toLowerCase();
                        return role.includes('barber') || role.includes('tatu') || role.includes('estilista');
                      }).map(member => ({ value: member.id, label: member.name, imageUrl: member.image_url || member.avatar_url || '', avatarFallback: (member.name || '?').trim().charAt(0).toUpperCase(), subtitle: (member.role || 'Profesional').split('|')[0] }))}
                    />
                    <p style={{ margin: '8px 0 0', color: '#ffcc80', fontSize: '10px', lineHeight: 1.4 }}>El cliente paga $0. No se genera comisión del odontólogo; se le carga la parte de la clínica y la profilaxis completa.</p>
                  </div>
                )}

                {settlementType !== 'paid' && settlementType !== 'exchange' && (
                  <div style={{ padding: '11px 13px', borderRadius: '10px', marginBottom: '14px', background: settlementType === 'receivable' ? 'rgba(255,159,10,.08)' : 'rgba(100,210,255,.08)', border: `1px solid ${settlementType === 'receivable' ? 'rgba(255,159,10,.3)' : 'rgba(100,210,255,.25)'}`, color: settlementType === 'receivable' ? '#ffcc80' : '#8bdcff', fontSize: '10px', lineHeight: 1.45 }}>
                    {settlementType === 'receivable' ? 'El cliente no paga ahora. La deuda quedará registrada en Cuentas por cobrar y no generará comisión hasta ser cobrada.' : 'Cortesía asumida por la clínica: cuenta como servicio realizado, pero no generará ingreso, deuda ni comisiones.'}
                  </div>
                )}

                {settlementType === 'paid' && <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button 
                    onClick={() => { setPaymentMode('full_usd'); setCashUsd(totalUsd); }}
                    style={{ 
                      flex: 1, height: isMobile ? '46px' : '38px', borderRadius: '10px', 
                      border: paymentMode === 'full_usd' ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                      background: paymentMode === 'full_usd' ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                      color: paymentMode === 'full_usd' ? 'var(--gold-primary)' : 'var(--text-muted)', 
                      fontWeight: '800', cursor: 'pointer', fontSize: '10px', transition: 'all 0.2s',
                      boxShadow: paymentMode === 'full_usd' ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                    }}
                  >TODO EN $</button>
                  <button 
                    onClick={() => { setPaymentMode('full_bs'); setCashUsd(0); }}
                    style={{ 
                      flex: 1, height: isMobile ? '46px' : '38px', borderRadius: '10px', 
                      border: paymentMode === 'full_bs' ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                      background: paymentMode === 'full_bs' ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                      color: paymentMode === 'full_bs' ? 'var(--gold-primary)' : 'var(--text-muted)', 
                      fontWeight: '800', cursor: 'pointer', fontSize: '10px', transition: 'all 0.2s',
                      boxShadow: paymentMode === 'full_bs' ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                    }}
                  >TODO EN BS</button>
                  <button 
                    onClick={() => setPaymentMode('mixed')}
                    style={{ 
                      flex: 1, height: isMobile ? '46px' : '38px', borderRadius: '10px', 
                      border: paymentMode === 'mixed' ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                      background: paymentMode === 'mixed' ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                      color: paymentMode === 'mixed' ? 'var(--gold-primary)' : 'var(--text-muted)', 
                      fontWeight: '800', cursor: 'pointer', fontSize: '10px', transition: 'all 0.2s',
                      boxShadow: paymentMode === 'mixed' ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                    }}
                  >PAGO MIXTO</button>
                </div>

                {paymentMode === 'full_usd' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', marginBottom: '12px' }}>
                    <FieldLabel required>Método de Pago ($)</FieldLabel>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setMethodUsd(m)}
                          style={{ 
                            flex: 1, padding: '8px', borderRadius: '10px', 
                            border: methodUsd === m ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                            background: methodUsd === m ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                            color: methodUsd === m ? 'var(--gold-primary)' : 'var(--text-muted)', 
                            fontSize: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: methodUsd === m ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                          }}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMode === 'full_bs' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>TOTAL EN BOLÍVARES (BS)</label>
                      <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '16px' }}>{formatCurrency(totalBs)} BS</div>
                    </div>
                    <FieldLabel required>Método de Pago (BS)</FieldLabel>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['Pago Móvil', 'Efectivo', 'Punto de venta'].map(m => (
                        <button 
                          key={m}
                          onClick={() => {
                            if (m !== methodBs) setPaymentReferenceBs('');
                            setMethodBs(m);
                          }}
                          style={{ 
                            flex: 1, padding: '8px', borderRadius: '10px', 
                            border: methodBs === m ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                            background: methodBs === m ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                            color: methodBs === m ? 'var(--gold-primary)' : 'var(--text-muted)', 
                            fontSize: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: methodBs === m ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                          }}
                        >{m}</button>
                      ))}
                    </div>
                    {['Pago Móvil', 'Punto de venta'].includes(methodBs) && (
                      <div style={{ marginTop: '12px' }}>
                        <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '7px', display: 'block' }}>
                          {methodBs === 'Pago Móvil' ? 'ÚLTIMOS 4 DÍGITOS DE LA REFERENCIA' : 'REFERENCIA DEL PUNTO DE VENTA'}
                        </label>
                        <input
                          type="text"
                          inputMode={methodBs === 'Pago Móvil' ? 'numeric' : 'text'}
                          maxLength={methodBs === 'Pago Móvil' ? 4 : 40}
                          value={paymentReferenceBs}
                          onChange={(e) => {
                            const value = methodBs === 'Pago Móvil'
                              ? e.target.value.replace(/\D/g, '').slice(0, 4)
                              : e.target.value.slice(0, 40);
                            setPaymentReferenceBs(value);
                          }}
                          placeholder={methodBs === 'Pago Móvil' ? 'Ej. 4821' : 'Ej. 00123456'}
                          style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '12px', fontWeight: '700', boxSizing: 'border-box' }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {paymentMode === 'mixed' && (
                  <div className="animate-slide-up" style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>1. PAGO EN DÓLARES ($)</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <input 
                          type="number" 
                          value={cashUsd} 
                          onChange={(e) => setCashUsd(e.target.value)}
                          style={{ flex: 1, height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'right', paddingRight: '10px', fontSize: '12px' }} 
                        />
                        <div style={{ display: 'flex', flex: 2, gap: '4px', flexWrap: 'wrap' }}>
                          {['Efectivo', 'Zelle', 'Binance', 'Zinli'].map(m => (
                            <button 
                              key={m}
                              onClick={() => setMethodUsd(m)}
                              style={{ 
                                flex: '1 0 45%', padding: '8px', borderRadius: '8px', 
                                border: methodUsd === m ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                                background: methodUsd === m ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                                color: methodUsd === m ? 'var(--gold-primary)' : 'var(--text-muted)', 
                                fontSize: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: methodUsd === m ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                              }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                      <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>2. RESTANTE EN BOLÍVARES (BS)</label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: '900', color: 'var(--gold-primary)', fontSize: '16px' }}>{formatCurrency(remainingBs)} BS</div>
                        <div style={{ display: 'flex', flex: 1.5, gap: '4px', flexWrap: 'wrap', marginLeft: '10px' }}>
                          {['Pago Móvil', 'Efectivo', 'Punto de venta'].map(m => (
                            <button 
                              key={m}
                              onClick={() => {
                                if (m !== methodBs) setPaymentReferenceBs('');
                                setMethodBs(m);
                              }}
                              style={{ 
                                flex: '1 0 45%', padding: '8px', borderRadius: '8px', 
                                border: methodBs === m ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)', 
                                background: methodBs === m ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                                color: methodBs === m ? 'var(--gold-primary)' : 'var(--text-muted)', 
                                fontSize: '10px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: methodBs === m ? '0 0 10px rgba(17, 17, 17,0.1)' : 'none'
                              }}
                            >{m}</button>
                          ))}
                        </div>
                      </div>
                      {['Pago Móvil', 'Punto de venta'].includes(methodBs) && (
                        <div style={{ marginTop: '10px' }}>
                          <label style={{ fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)', marginBottom: '7px', display: 'block' }}>
                            {methodBs === 'Pago Móvil' ? 'ÚLTIMOS 4 DÍGITOS DE LA REFERENCIA' : 'REFERENCIA DEL PUNTO DE VENTA'}
                          </label>
                          <input
                            type="text"
                            inputMode={methodBs === 'Pago Móvil' ? 'numeric' : 'text'}
                            maxLength={methodBs === 'Pago Móvil' ? 4 : 40}
                            value={paymentReferenceBs}
                            onChange={(e) => {
                              const value = methodBs === 'Pago Móvil'
                                ? e.target.value.replace(/\D/g, '').slice(0, 4)
                                : e.target.value.slice(0, 40);
                              setPaymentReferenceBs(value);
                            }}
                            placeholder={methodBs === 'Pago Móvil' ? 'Ej. 4821' : 'Ej. 00123456'}
                            style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '12px', fontWeight: '700', boxSizing: 'border-box' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </>}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button 
                  onClick={handleCancelOrder}
                  disabled={loading}
                  style={{ 
                    flex: '1', 
                    minWidth: 0,
                    height: isMobile ? '38px' : '42px', 
                    borderRadius: '10px', 
                    fontSize: isMobile ? '10px' : '12px', 
                    gap: '4px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 69, 58, 0.1)',
                    border: '1.5px solid rgba(255, 69, 58, 0.4)',
                    color: '#ff453a',
                    fontWeight: '900',
                    cursor: 'pointer',
                    transition: '0.3s',
                    padding: '0 8px',
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 69, 58, 0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 69, 58, 0.1)'}
                >
                  <XCircle size={isMobile ? 14 : 20} style={{ flexShrink: 0 }} /> {isMobile ? 'CANCELAR' : 'CANCELAR'}
                </button>

                <button 
                  onClick={handleProcessCheckout}
                  disabled={loading}
                  style={{ 
                    flex: '2', height: isMobile ? '46px' : '52px', borderRadius: '14px', fontSize: isMobile ? '13px' : '15px', fontWeight: '900', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(17, 17, 17,0.2) 0%, rgba(17, 17, 17,0.05) 100%)',
                    border: loading ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(17, 17, 17,0.4)', 
                    color: loading ? 'var(--text-muted)' : 'var(--gold-primary)', 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: loading ? 'none' : '0 8px 24px -8px rgba(17, 17, 17,0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCcw className="animate-spin" size={isMobile ? 18 : 22} /> PROCESANDO...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={isMobile ? 18 : 22} /> FINALIZAR COBRO
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </CartWrapper>
      </div>
    </div>

      <PandaDialog 
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      {/* Product Selection Modal */}
      <AnimatedModal isOpen={false}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={`${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: 'min(780px, 90vw)', width: '100%', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
              
              {/* Header */}
              <div style={{ padding: '28px 28px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(255, 255, 255,0.2), rgba(255, 255, 255,0.05))', border: '1px solid rgba(255, 255, 255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingBag size={18} color="var(--gold-primary)" />
                      </div>
                      <h2 style={{ fontWeight: '900', fontSize: '22px', letterSpacing: '-0.3px', color: 'white' }}>Productos y Cortesías</h2>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '46px' }}>
                      {inventory.filter(i => matchesInventorySalesGroup(i, productGroup) && i.name.toLowerCase().includes(debouncedProductSearch.toLowerCase())).length} opciones disponibles
                    </p>
                  </div>
                   <button onClick={() => {setShowProductModal(false); setSearchTerm(''); setProductGroup('all');}} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>×</button>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} size={16} color="rgba(255, 255, 255,0.7)" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', height: '44px', padding: '0 44px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 4px 16px 4px', margin: '-4px -4px 0 -4px' }}>
                  {Object.entries(INVENTORY_SALES_GROUPS).map(([value, label]) => (
                    <button 
                      key={value} 
                      type="button" 
                      onClick={() => setProductGroup(value)} 
                      style={{ 
                        padding: '9px 16px', borderRadius: '12px', 
                        border: productGroup === value ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.08)', 
                        background: productGroup === value ? 'rgba(17, 17, 17,0.08)' : 'rgba(255,255,255,0.02)', 
                        color: productGroup === value ? 'var(--gold-primary)' : 'rgba(255,255,255,0.7)', 
                        fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: productGroup === value ? '0 0 12px rgba(17, 17, 17,0.1)' : 'none'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div style={{ padding: '0 28px 28px', overflowY: 'auto', flex: 1 }}>
                {inventory.filter(i => matchesInventorySalesGroup(i, productGroup) && i.name.toLowerCase().includes(debouncedProductSearch.toLowerCase())).length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ShoppingBag size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                    <p>Sin resultados para "{searchTerm}"</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
                    {inventory.filter(i => matchesInventorySalesGroup(i, productGroup) && i.name.toLowerCase().includes(debouncedProductSearch.toLowerCase())).map(item => {
                      const isOutOfStock = (item.stock || 0) <= 0;
                      return (
                        <button
                          key={item.id}
                          className="pos-extra-card"
                          onClick={() => !isOutOfStock && handleAddToCart(item)}
                          disabled={isOutOfStock}
                          style={{
                            padding: '0',
                            borderRadius: '20px',
                            border: isOutOfStock ? '1px solid rgba(255,59,48,0.2)' : '1px solid rgba(255,255,255,0.07)',
                            background: isOutOfStock ? 'rgba(255,59,48,0.03)' : 'rgba(255,255,255,0.03)',
                            textAlign: 'left',
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            opacity: isOutOfStock ? 0.55 : 1,
                            overflow: 'hidden',
                          }}
                        >
                          {/* Image area */}
                          <div style={{ width: '100%', height: '110px', background: 'rgba(255,255,255,0.02)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.image_url
                              ? <img loading="lazy" src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px', boxSizing: 'border-box', filter: isOutOfStock ? 'grayscale(80%)' : 'none', transition: 'transform 0.3s' }} alt="" />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <ShoppingBag size={32} color="rgba(255,255,255,0.12)" />
                                </div>
                            }
                            {/* Stock badge */}
                            <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '3px 8px', borderRadius: '20px', background: isOutOfStock ? 'rgba(255,59,48,0.85)' : 'rgba(48,209,88,0.85)', backdropFilter: 'blur(6px)', fontSize: '10px', fontWeight: '800', color: 'white', letterSpacing: '0.3px' }}>
                              {isOutOfStock ? 'AGOTADO' : `×${item.stock}`}
                            </div>
                          </div>

                          {/* Info area */}
                          <div style={{ padding: '12px 14px 14px' }}>
                            <div style={{ color: String(item.inventory_type).toLowerCase() === 'cafe' ? '#ff9f0a' : '#30d158', fontWeight: '850', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>{getInventorySalesLabel(item)}</div>
                            <div style={{ fontWeight: '800', fontSize: '13px', color: 'white', marginBottom: '8px', lineHeight: '1.3' }}>{item.name}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              <span style={{ color: 'var(--gold-primary)', fontWeight: '900', fontSize: '18px' }}>${item.price}</span>
                            </div>
                            {rates?.usd > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>≈ {Math.round(item.price * rates.usd).toLocaleString()} Bs.</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      <SellableInventoryModal
        isOpen={showProductModal}
        items={inventory}
        rates={rates}
        onClose={() => setShowProductModal(false)}
        onSelect={handleAddToCart}
      />

      {/* Extras Selection Modal */}
      <AnimatedModal isOpen={showExtraModal}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={`${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: 'min(820px, 90vw)', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '28px', border: '1px solid rgba(17, 17, 17,.28)', overflow: 'hidden', background: 'var(--bg-secondary)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset' }}>
              {/* Header */}
              <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255, 255, 255,0.2), rgba(255, 255, 255,0.05))', border: '1px solid rgba(255, 255, 255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={20} color="var(--gold-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontWeight: '900', fontSize: '20px', color: 'white', marginBottom: '2px' }}>Servicios Extras</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{allExtras.length} extras disponibles</p>
                    </div>
</div>
                   <button onClick={() => setShowExtraModal(false)} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              </div>
              {/* Items in a grid */}
              <div style={{ padding: '16px 20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: '10px', overflowY: 'auto', flex: 1, minHeight: 0, alignContent: 'start' }}>
                {allExtras.map((extra) => {
                  // Function to get a minimalist Lucide icon based on the service name
                  const getExtraItemConfig = (name) => {
                    const cleanName = (name || '').toLowerCase();
                    if (cleanName.includes('alisado') || cleanName.includes('planchado') || cleanName.includes('secado')) {
                      return { Icon: GiHairStrands };
                    }
                    if (cleanName.includes('hidratación') || cleanName.includes('hidratacion') || cleanName.includes('capilar')) {
                      return { Icon: GiWaterDrop };
                    }
                    if (cleanName.includes('profundo')) {
                      return { Icon: Waves };
                    }
                    if (cleanName.includes('lavado') || cleanName.includes('express') || cleanName.includes('champu')) {
                      return { Icon: GiShower };
                    }
                    if (cleanName.includes('mask') || cleanName.includes('mascarilla') || cleanName.includes('negra')) {
                      return { Icon: VenetianMask };
                    }
                    if (cleanName.includes('nariz') || cleanName.includes('naríz')) {
                      return { Icon: GiNoseFront };
                    }
                    if (cleanName.includes('oido') || cleanName.includes('oído') || cleanName.includes('oreja')) {
                      return { Icon: TbEar };
                    }
                    if (cleanName.includes('exfoliacion') || cleanName.includes('exfoliación') || cleanName.includes('facial') || cleanName.includes('cutis') || cleanName.includes('limpieza')) {
                      return { Icon: GiTowel };
                    }
                    if (cleanName.includes('ceja')) {
                      return { Icon: MdFace3 };
                    }
                    if (cleanName.includes('barba') || cleanName.includes('afeitado') || cleanName.includes('perfilado') || cleanName.includes('epilacion') || cleanName.includes('epilación')) {
                      return { Icon: GiBeard };
                    }
                    return { Icon: Zap };
                  };

                  const config = getExtraItemConfig(extra.name);
                  const IconComponent = config.Icon;

                  const isSelected = selectedApp 
                    ? selectedApp.extras_added?.some(e => String(e.extra_id) === String(extra.id))
                    : cart.some(item => item.type === 'extra' && String(item.id).replace('extra_', '') === String(extra.id));

                  const toggleExtra = () => {
                    if (selectedApp) {
                      const addedRecord = selectedApp.extras_added?.find(e => String(e.extra_id) === String(extra.id));
                      if (addedRecord) handleRemoveExtra(addedRecord.id);
                    } else {
                      setCart(cart.filter(item => !(item.type === 'extra' && String(item.id).replace('extra_', '') === String(extra.id))));
                    }
                  };

                  return (
                    <article key={extra.id} className="pos-extra-card" style={{ display: 'flex', flexDirection: 'column', height: '230px', overflow: 'hidden', borderRadius: '16px', border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,.08)'}`, background: isSelected ? 'rgba(17, 17, 17, 0.05)' : 'rgba(255,255,255,.025)', transition: 'all 0.2s' }}>
                      <div role="button" tabIndex={0} onClick={() => isSelected ? toggleExtra() : handleAddExtra(extra)} onKeyDown={(e) => { if(e.key==='Enter'||e.key===' ') isSelected ? toggleExtra() : handleAddExtra(extra); }} style={{ padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', outline: 'none' }}>
                        <div style={{ height: '140px', width: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)' }}>
                            <IconComponent size={32} strokeWidth={1.5} />
                          </div>
                          {isSelected && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--gold-primary)', color: 'black', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ color: 'var(--gold-primary)', fontSize: '9px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.55px' }}>Servicio Extra</span>
                          <h3 style={{ margin: '4px 0 6px', color: '#fff', fontSize: '13px', lineHeight: 1.2, fontWeight: 900, textTransform: 'capitalize', display: 'block' }}>{extra.name || 'Extra'}</h3>
                          <strong style={{ color: 'var(--gold-primary)', fontSize: '18px', lineHeight: 1, display: 'block' }}>${extra.price || 0}</strong>
                          {rates?.usd > 0 && <span style={{ marginTop: '4px', display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11.5px', fontWeight: 500 }}>≈ {Math.round((extra.price || 0) * rates.usd).toLocaleString('es-VE')} Bs</span>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Service Modal */}
      <AnimatedModal isOpen={showServiceModal}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={`${cardClass.replace('global-modal-card', '')}`} style={{ maxWidth: 'min(820px, 90vw)', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '28px', border: '1px solid rgba(17, 17, 17,.28)', overflow: 'hidden', background: 'var(--bg-secondary)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset' }}>
              {/* Header */}
              <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255, 255, 255,0.25), rgba(255, 255, 255,0.05))', border: '1px solid rgba(255, 255, 255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Scissors size={20} color="var(--gold-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontWeight: '900', fontSize: '20px', color: 'white', marginBottom: '2px' }}>Catálogo de Servicios</h2>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{allServices.length} servicios disponibles</p>
                    </div>
                  </div>
                   <button onClick={() => setShowServiceModal(false)} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              </div>
              {/* Items grid */}
              <div className="panda-scrollbar" style={{ padding: '16px 20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: '10px', overflowY: 'auto', flex: 1, minHeight: 0, alignContent: 'start' }}>
                {allServices.map((service, i) => {
                  const isSelected = selectedApp 
                    ? selectedApp.service_id === service.id // Note: For selectedApp, modifying the main service is more complex, usually they don't do it here
                    : cart.some(item => item.type === 'service' && String(item.id).replace('service_', '') === String(service.id));

                  const toggleService = () => {
                    if (!selectedApp) {
                      setCart(cart.filter(item => !(item.type === 'service' && String(item.id).replace('service_', '') === String(service.id))));
                    }
                  };

                  const CorteYBarbaIcon = (props) => (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Scissors {...props} />
                      <GiBeard {...props} />
                    </div>
                  );

                  const getServiceIcon = (name) => {
                    const cleanName = (name || '').toLowerCase();
                    if (cleanName.includes('niño') || cleanName.includes('niña') || cleanName.includes('kid')) return FaChild;
                    if (cleanName.includes('vip') || cleanName.includes('premium')) return MdWorkspacePremium;
                    if (cleanName.includes('tatuaje') || cleanName.includes('tattoo')) return PenTool;
                    if (cleanName.includes('corte') && cleanName.includes('barba')) return CorteYBarbaIcon;
                    if (cleanName.includes('barba') || cleanName.includes('perfilado')) return GiBeard;
                    if (cleanName.includes('ceja')) return MdFace3;
                    if (cleanName.includes('color') || cleanName.includes('tinte')) return GiBottleVapors;
                    return Scissors;
                  };
                  const ServiceIcon = getServiceIcon(service.name);

                  return (
                  <article key={service.id} className="pos-extra-card" style={{ display: 'flex', flexDirection: 'column', height: '230px', overflow: 'hidden', borderRadius: '16px', border: `1px solid ${isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,.08)'}`, background: isSelected ? 'rgba(17, 17, 17, 0.05)' : 'rgba(255,255,255,.025)', transition: 'all 0.2s' }}>
                    <div role="button" tabIndex={0} onClick={() => isSelected ? toggleService() : handleAddService(service)} onKeyDown={(e) => { if(e.key==='Enter'||e.key===' ') isSelected ? toggleService() : handleAddService(service); }} style={{ padding: 0, border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', outline: 'none' }}>
                      <div style={{ height: '140px', width: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)' }}>
                          <ServiceIcon size={32} />
                        </div>
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--gold-primary)', color: 'black', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ color: 'var(--gold-primary)', fontSize: '9px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.55px' }}>Servicio Base</span>
                        <h3 style={{ margin: '4px 0 6px', color: '#fff', fontSize: '13px', lineHeight: 1.2, fontWeight: 900, textTransform: 'capitalize', display: 'block' }}>{service.name || 'Servicio'}</h3>
                        <strong style={{ color: 'var(--gold-primary)', fontSize: '18px', lineHeight: 1, display: 'block' }}>${formatUsdAmount(service.price || 0)}</strong>
                        {rates?.usd > 0 && <span style={{ marginTop: '4px', display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11.5px', fontWeight: 500 }}>≈ {Math.round(Number(service.price || 0) * rates.usd).toLocaleString('es-VE')} Bs</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* Barber Select Modal */}
      <AnimatedModal isOpen={showBarberModal}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 20000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={cardClass.replace('global-modal-card', '')} style={{ width: '100%', maxWidth: '380px', borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.25)', background: 'var(--bg-secondary)', boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset', overflow: 'hidden' }}>
              {/* Gradient Accent Bar */}
              <div style={{ height: '5px', background: 'linear-gradient(90deg, #ffffff 0%, #111111 50%, #ffffff 100%)', width: '100%' }}></div>
              
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))', border: '1px solid rgba(255, 255, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Scissors size={20} color="var(--gold-primary)" />
                    </div>
                    <div>
                      <h2 style={{ fontWeight: '900', fontSize: '20px', color: 'white', margin: 0 }}>Asignar Profesional</h2>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seleccionar Odontólogo o Asistente</span>
                    </div>
                  </div>
                   <button onClick={() => { setShowBarberModal(false); setIsChangingBarber(false); }} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#ff453a'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}>&times;</button>
                </div>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px', lineHeight: '1.4' }}>
                  {isChangingBarber ? (
                    "Selecciona el nuevo odontólogo o asistente para esta cita."
                  ) : (
                    <>Asigna la comisión por el servicio <strong>{selectedServiceForBarber?.name}</strong> al profesional correspondiente.</>
                  )}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto', paddingRight: '8px' }} className="panda-scrollbar">
                  {allStaff.filter(s => {
                    const roleName = (s.role?.split('|')[0] || '').toLowerCase();
                    return !roleName.includes('admin') && 
                           !roleName.includes('recepcionista') && 
                           !roleName.includes('caja');
                  }).map(barber => (
                    <button
                      key={barber.id}
                      disabled={loading}
                      onClick={() => isChangingBarber ? handleChangeBarber(barber.id) : handleConfirmServiceBarber(barber.id)}
                      style={{
                        opacity: loading ? 0.6 : 1,
                        pointerEvents: loading ? 'none' : 'auto',
                        padding: '14px 16px', 
                        borderRadius: '18px', 
                        border: '1px solid rgba(255,255,255,0.08)', 
                        background: 'rgba(255,255,255,0.03)', 
                        textAlign: 'left', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '14px',
                        transition: 'all 0.22s ease'
                      }} 
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.borderColor = 'var(--gold-primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', flexShrink: 0 }}>
                        {barber.image_url ? (
                           <img loading="lazy" src={barber.image_url} alt={barber.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontWeight: '900', fontSize: '15px' }}>{barber.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', color: 'white', fontSize: '15px' }}>{barber.name}</div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{barber.role?.split('|')[0]}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      <NewClientModal 
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onSuccess={handleNewClientSuccess}
      />

      {/* Link Citas Modal (Pago Grupal) */}
      <AnimatedModal isOpen={showLinkModal}>
        {(overlayClass, cardClass) => (
          <div className={overlayClass} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={`${cardClass.replace('global-modal-card', '')} glass-card`} style={{ maxWidth: 'min(560px, 90vw)', width: '100%', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '28px', background: 'var(--bg-secondary)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontWeight: '900', fontSize: '20px' }}>Enlazar Citas en Espera</h2>
                <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '13px' }}>
                Selecciona los clientes que están en sillón o pendientes de cobro para cargarlos a la cuenta de <strong>{selectedApp?.clients?.name}</strong>.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }} className="panda-scrollbar">
                {groupedActiveServices.filter(g => g.client_id !== selectedApp?.client_id && !linkedApps.some(la => la.client_id === g.client_id)).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay otros clientes pendientes en sillón o por pagar.
                  </div>
                ) : (
                  groupedActiveServices
                    .filter(g => g.client_id !== selectedApp?.client_id && !linkedApps.some(la => la.client_id === g.client_id))
                    .map(group => {
                      const sNames = group.apps.map(a => a.services?.name).filter(Boolean).join(' + ') || 'Servicio';
                      const tPrice = group.apps.reduce((acc, a) => acc + (a.total_price !== undefined && a.total_price !== null && Number(a.total_price) > 0 ? Number(a.total_price) : (a.services?.price || 0)), 0);
                      return (
                        <div 
                          key={group.client_id}
                          style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{group.client_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sNames}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: '13px' }}>{(tPrice * fixedRate).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ref: ${Number(tPrice).toFixed(2)}</div>
                            </div>
                            <button 
                              onClick={() => {
                                setLinkedApps([...linkedApps, ...group.apps]);
                                showToast(`Cita de ${group.client_name} enlazada.`);
                              }}
                              style={{ 
                                padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900',
                                background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                                border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(17, 17, 17,0.1)'
                              }}
                            >
                              Enlazar
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowLinkModal(false)} 
                  style={{ 
                    padding: '10px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                    border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)'
                  }}
                >
                  LISTO
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {/* ── Pagos pendientes offline ── */}
      <AnimatedModal isOpen={showOfflineModal}>
        {(overlayClass, cardClass) => (
          <div className={`${overlayClass} modal-centered-overlay`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
            <div className={`${cardClass.replace('global-modal-card', '')} modal-popup-centered`} style={{ maxWidth: 'min(620px, 90vw)', width: '100%', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-secondary)', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,149,0,0.12)', border: '1px solid rgba(255,149,0,0.35)', color: '#ff9500' }}>
                    <RefreshCcw size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontWeight: '900', fontSize: '18px', lineHeight: 1.15 }}>Pagos pendientes offline</h2>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{offlineItems.length} en cola</span>
                  </div>
                </div>
                <button onClick={() => setShowOfflineModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', width: '44px', height: '44px', borderRadius: '12px', fontSize: '20px', lineHeight: 1, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '10px 0 18px', fontSize: '12.5px', lineHeight: 1.5 }}>
                Cobros que aún no se sincronizaron con el servidor. Cuando vuelva la conexión se reintentan solos; también puedes forzar el reintento o descartar los que hayan quedado atascados.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '8px' }} className="panda-scrollbar">
                {offlineItems.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay pagos pendientes. ¡Todo sincronizado! ✅
                  </div>
                ) : (
                  offlineItems.map(item => {
                    const p = item.payment || {};
                    const usd = Number(p.totalUsd || 0);
                    const bs = usd * Number(p.fixedRate || fixedRate || 0);
                    let when = '';
                    try { when = new Date(item.createdAt).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { when = ''; }
                    return (
                      <div key={item.id} style={{ padding: '14px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{p.clientName || 'Cliente'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.serviceName || 'Venta de productos'}</div>
                            {when && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>En cola desde {when}</div>}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: '700', color: 'var(--gold-primary)', fontSize: '13px' }}>{bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Ref: ${usd.toFixed(2)}</div>
                          </div>
                        </div>
                        {item.lastError && (
                          <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#ff6b6b', background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', borderRadius: '8px', padding: '6px 8px', wordBreak: 'break-word' }}>
                            Error al sincronizar: {item.lastError}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                          <button
                            onClick={() => handleDiscardOffline(item.id)}
                            disabled={offlineBusy}
                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.3)', color: '#ff6b6b', cursor: offlineBusy ? 'not-allowed' : 'pointer' }}
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  onClick={handleRetryOffline}
                  disabled={offlineBusy || offlineItems.length === 0}
                  style={{ 
                    padding: '10px 20px', borderRadius: '12px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (offlineBusy || offlineItems.length === 0) ? 0.5 : 1, cursor: (offlineBusy || offlineItems.length === 0) ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                    border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)'
                  }}
                >
                  <RefreshCcw size={14} /> Reintentar
                </button>
                <button
                  onClick={() => setShowOfflineModal(false)}
                  style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: '800', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatedModal>

      {isMobile && totalUsd > 0 && !showMobileCart && createPortal(
        <div style={{ position: 'fixed', bottom: '24px', left: '16px', right: '16px', zIndex: 9999, perspective: '1000px' }}>
          <button 
            onClick={() => setShowMobileCart(true)}
            className="animate-slide-up"
            style={{ 
              width: '100%', 
              padding: '16px 20px', 
              borderRadius: '20px', 
              background: 'var(--bg-secondary)', 
              backdropFilter: 'blur(20px)', 
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              cursor: 'pointer',
              transition: 'transform 0.2s ease, background 0.2s ease'
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onPointerCancel={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={18} color="white" strokeWidth={1.5} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: '15px' }}>Ver Carrito</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '6px 12px', borderRadius: '10px' }}>
              <span style={{ color: 'black', fontWeight: '800', fontSize: '14px' }}>
                ${Number(totalUsd).toFixed(2)}
              </span>
            </div>
          </button>
        </div>,
        document.body
      )}

      <style>{`
        .hover-item:hover {
          border-color: var(--gold-primary) !important;
          background-color: rgba(255, 255, 255,0.05) !important;
          transform: translateY(-2px);
        }
      `}</style>

      {/* VISTA PREVIA DE LA FACTURA (antes de cobrar) */}
      {previewReceipt && createPortal(
        <div onClick={() => setPreviewReceipt(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))', boxSizing: 'border-box' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '10px', maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <ReceiptTicket transaction={previewReceipt} />
          </div>
          <button
            onClick={() => setPreviewReceipt(null)}
            style={{ marginTop: '16px', padding: '12px 28px', borderRadius: '12px', border: 'none', background: 'var(--gold-primary)', color: '#000', fontWeight: '900', fontSize: '14px', cursor: 'pointer' }}
          >
            Cerrar
          </button>
          <p style={{ marginTop: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', textAlign: 'center' }}>Vista previa — la factura final se genera al completar el cobro.</p>
        </div>,
        document.body
      )}

      {/* TICKET DE IMPRESIÓN OCULTO Y MODAL DE ÉXITO */}
      {printTransaction && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="glass-card animate-scale-in" style={{ padding: '32px', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
            <CheckCircle size={64} color="var(--success-color)" style={{ margin: '0 auto 20px auto' }} />
            <h2 style={{ marginBottom: '12px', fontSize: '24px', fontWeight: '900' }}>¡Cobro Exitoso!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>El pago de {printTransaction.client?.name} ha sido procesado.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => {
                  window.print();
                }}
                style={{ 
                  width: '100%', padding: '16px', borderRadius: '14px', fontWeight: '800', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(17, 17, 17,0.15) 0%, rgba(17, 17, 17,0.02) 100%)',
                  border: '1px solid rgba(17, 17, 17,0.3)', color: 'var(--gold-primary)'
                }}
              >
                <Printer size={16} /> Imprimir Recibo
              </button>
              <button 
                onClick={() => {
                  setPrintTransaction(null);
                  setSelectedApp(null);
                  setSelectedClient(null);
                  setIsDirectSale(false);
                  setCart([]);
                  setTips([]);
                  setCashUsd(0);
                  setPaymentMode('full_bs');
                  setSettlementType('paid');
                  setExchangeStaffId('');
                  setMethodBs('Pago Móvil');
                  setPaymentReferenceBs('');
                }}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: '800', cursor: 'pointer' }}
              >
                Cerrar y Continuar
              </button>
            </div>
          </div>
          
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            <ReceiptTicket transaction={printTransaction} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPOS;



