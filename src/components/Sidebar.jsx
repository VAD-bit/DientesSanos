import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart3, 
  Users, 
  Scissors, 
  Package, 
  Wallet, 
  Star,
  Calendar,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  ClipboardList,
  CreditCard,
  UserCheck,
  UserCircle,
  User,
  Settings,
  History,
  Bell,
  CheckCircle,
  Coffee
} from 'lucide-react';
import logo from '../assets/logo.png';
import sidebarLogo from '../assets/sidebar_logo.png';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { notificationService } from '../services/notificationService';
import { isSupportStaff } from '../utils/staffRoles';

// Tooltip de íconos del sidebar: se porta al body con posición fija calculada
// a partir del botón, para que el overflow del sidebar no lo corte.
const SidebarTooltip = ({ targetRef, label, danger }) => {
  if (!targetRef.current) return null;
  const rect = targetRef.current.getBoundingClientRect();
  return createPortal(
    <div
      className={`sidebar-tooltip-fixed${danger ? ' sidebar-tooltip-danger' : ''}`}
      style={{ top: rect.top + rect.height / 2, left: rect.right + 12 }}
    >
      {label}
    </div>,
    document.body
  );
};

const Sidebar = ({ activeTab, setActiveTab, isMobile, rates, isCollapsed, setIsCollapsed, activeRateType, onToggleRateType }) => {
  const { user, logout } = useAuth();
  const { isModalOpen } = useModal();
  const [notifPermission, setNotifPermission] = useState(() => notificationService.getPermissionStatus());

  const handleToggleNotif = async () => {
    if (notifPermission === 'granted') return;
    const res = await notificationService.requestPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      notificationService.sendNotification('🔔 Notificaciones Activadas', '¡Excelente! Ahora recibirás alertas en tiempo real de citas y avisos.');
    }
  };

  const allMenuItems = [
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle, roles: ['Admin', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'dashboard', label: 'Inicio', icon: BarChart3, roles: ['Admin', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Barbero', 'Recepcionista'] },
    { id: 'reception', label: 'Recepción', icon: ClipboardList, roles: ['Admin', 'Recepcionista'] },
    { id: 'checkout', label: 'Caja', icon: CreditCard, roles: ['Admin', 'Caja'] },
    { id: 'panels', label: 'Paneles', icon: Scissors, roles: ['Admin'] },
    // Legacy direct routes remain available to staff accounts; admins use the unified Paneles entry.
    { id: 'barber', label: 'Mi sillón', icon: Scissors, roles: ['Barbero'] },
    { id: 'barista', label: 'Panel de Barista', icon: Coffee, roles: ['Barista'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Recepcionista', 'Barbero', 'Caja'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'personnel', label: 'Equipo', icon: UserCheck, roles: ['Admin'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'reports', label: 'Reportes', icon: PieChart, roles: ['Admin'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'settings', label: 'Ajustes', icon: Settings, roles: ['Admin'] },
  ];

  const menuItems = (() => {
    const userRole = user?.role || '';
    const [roleName, customPerms] = userRole.split('|');
    const isBarista = roleName.toLowerCase().includes('barista') || roleName.toLowerCase().includes('cafeter');
    const permissionList = customPerms ? customPerms.split(',') : [];
    const legacyFullAccess = ['dashboard', 'scheduling', 'reception', 'checkout', 'barber', 'clients', 'personnel', 'services', 'inventory', 'finance', 'history'].every(id => permissionList.includes(id));
    const normalizedRole = roleName.toLowerCase();
    const isServiceProf = (normalizedRole.includes('barber') || normalizedRole.includes('barbero') || normalizedRole.includes('tatu')) && normalizedRole !== 'admin';

    if (isServiceProf) {
      const barberOrder = ['barber', 'scheduling', 'clients'];
      return barberOrder
        .map(id => allMenuItems.find(m => m.id === id))
        .filter(Boolean);
    }

    // Personal de apoyo (Editor, Marketing…): sin panel de silla; su menú es su perfil,
    // donde ve salario, pagos y consumo.
    if (isSupportStaff({ role: userRole })) {
      return ['my-profile'].map(id => allMenuItems.find(m => m.id === id)).filter(Boolean);
    }

    return allMenuItems.filter(item => {
      if (item.id === 'my-profile') return false; // Hides "Mi Perfil" from admin menu since bottom profile card is used
      if (roleName === 'Admin') return !['barber', 'barista'].includes(item.id);
      if (isBarista && legacyFullAccess) return true;
      if (item.id === 'barista' && isBarista) return true;
      
      if (roleName === 'Asistente de Lavado') {
        return ['dashboard', 'history', 'barber'].includes(item.id);
      }

      if (customPerms) {
        return permissionList.includes(item.id);
      }

      if (roleName.startsWith('Custom:')) {
        const perms = roleName.split(':')[1].split(',');
        return perms.includes(item.id);
      }

      return item.roles.some(role => role.toLowerCase() === roleName.toLowerCase());
    });
  })();

  const itemRefs = useRef([]);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isToggleHovered, setIsToggleHovered] = useState(false);
  const toggleBtnRef = useRef(null);
  const logoutBtnRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({
    transform: 'translateY(0px)',
    height: '0px',
    opacity: 0
  });

  const updateIndicator = (element) => {
    if (!element) return;
    setIndicatorStyle({
      transform: `translateY(${element.offsetTop}px)`,
      height: `${element.offsetHeight}px`,
      opacity: 1
    });
  };

  const displayedTab = hoveredTab || activeTab;

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeIndex = menuItems.findIndex(item => item.id === displayedTab);
      if (activeIndex !== -1 && itemRefs.current[activeIndex]) {
        updateIndicator(itemRefs.current[activeIndex]);
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [displayedTab, menuItems, isCollapsed]);

  const sidebarStyle = isMobile ? {
    width: '100%', height: 'auto', backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', padding: '0'
  } : {
    width: isCollapsed ? '75px' : '245px',
    height: '100vh',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    padding: isCollapsed ? '12px 8px' : '16px 12px 14px 12px',
    position: 'fixed', left: 0, top: 0,
    overflowY: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 100,
    transform: isModalOpen ? 'translateX(-100%)' : 'translateX(0)',
    opacity: isModalOpen ? 0 : 1,
    pointerEvents: isModalOpen ? 'none' : 'auto',
    boxShadow: '4px 0 40px rgba(0,0,0,0.6)',
  };

  const userRoleName = (user?.role || '').split('|')[0] || 'Administrador';

  return (
    <div className="sidebar animate-fade-in" style={sidebarStyle}>
      <style>{`
        /* Responsive adjustments for small screen heights */
        @media (max-height: 780px) {
          .logo-container-div {
            margin-bottom: 6px !important;
          }
          .sidebar-logo-img {
            max-width: 155px !important;
            margin-top: 4px !important;
          }
          .sidebar-bottom-div {
            gap: 6px !important;
          }
          .sidebar-profile-card {
            padding: 8px 10px !important;
          }
        }
      `}</style>

      {!isMobile && (
        <div className="logo-container logo-container-div" style={{ marginBottom: isCollapsed ? '12px' : '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative', zIndex: 2 }}>
          <button
            ref={toggleBtnRef}
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              position: isCollapsed ? 'relative' : 'absolute',
              right: isCollapsed ? 'auto' : '0',
              top: '0',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.25)',
              cursor: 'pointer',
              marginBottom: isCollapsed ? '10px' : '0',
              transition: 'color 0.2s ease',
              padding: '4px',
              borderRadius: '6px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--champagne)'; setIsToggleHovered(true); }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; setIsToggleHovered(false); }}
          >
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          {isToggleHovered && (
            <SidebarTooltip targetRef={toggleBtnRef} label={isCollapsed ? 'Expandir menú' : 'Minimizar menú'} />
          )}

          {!isCollapsed && (
            <img
              src={sidebarLogo}
              alt="Centro Odontológico Dientes Sanos"
              className="sidebar-logo-img"
              style={{
                width: '85%', height: 'auto', maxWidth: '185px', marginTop: '8px',
                filter: 'drop-shadow(0 0 12px rgba(17, 17, 17,0.12)) brightness(1.05)'
              }}
            />
          )}
        </div>
      )}

      <nav 
        onMouseLeave={() => setHoveredTab(null)}
        style={{ display: 'flex', flexDirection: 'column', gap: menuItems.length <= 4 ? '6px' : '2px', position: 'relative', zIndex: 2, flex: 1 }}
      >
        {/* Gliding active indicator pill */}
        <div 
          className="menu-active-indicator"
          style={{
            position: 'absolute',
            left: 0,
            width: '100%',
            background: 'linear-gradient(135deg, rgba(17, 17, 17, 0.10) 0%, rgba(17, 17, 17, 0.02) 100%)',
            border: '1px solid rgba(17, 17, 17, 0.18)',
            borderRadius: '9px',
            transition: 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1), height 0.22s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease',
            pointerEvents: 'none',
            zIndex: 0,
            ...indicatorStyle
          }}
        />

        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isHovered = hoveredTab === item.id;
          return (
            <button
              key={item.id}
              ref={el => itemRefs.current[index] = el}
              onClick={() => setActiveTab(item.id)}
              onMouseEnter={() => setHoveredTab(item.id)}
              className="sidebar-nav-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: isCollapsed ? '10px 0' : menuItems.length <= 4 ? '12px 14px' : '8px 12px',
                backgroundColor: 'transparent', border: 'none', borderRadius: '10px',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                textAlign: 'left', width: '100%',
                fontWeight: isActive ? '700' : '500',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                position: 'relative', zIndex: 1,
              }}
            >
              <div style={{
                color: isActive ? 'var(--champagne)' : isHovered ? 'rgba(17, 17, 17,0.75)' : 'rgba(17, 17, 17,0.4)',
                display: 'flex', alignItems: 'center',
                filter: isActive ? 'drop-shadow(0 0 7px rgba(17, 17, 17,0.65))' : isHovered ? 'drop-shadow(0 0 5px rgba(17, 17, 17,0.35))' : 'none',
                transition: 'all 0.25s ease',
              }}>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
              </div>
              {!isCollapsed && (
                <span className="sidebar-nav-text" style={{
                  fontSize: '13.5px',
                  letterSpacing: isActive ? '-0.2px' : '0',
                  color: isActive ? '#f8f8f8' : 'rgba(200,200,200,0.42)',
                  transition: 'all 0.2s ease',
                }}>
                  {item.label}
                </span>
              )}
              {!isCollapsed && isActive && (
                <div className="menu-gold-dot" />
              )}
            </button>
          );
        })}
      </nav>

      {isCollapsed && hoveredTab && (() => {
        const hoveredIndex = menuItems.findIndex(item => item.id === hoveredTab);
        const hoveredItem = menuItems[hoveredIndex];
        if (!hoveredItem || !itemRefs.current[hoveredIndex]) return null;
        return (
          <SidebarTooltip
            targetRef={{ current: itemRefs.current[hoveredIndex] }}
            label={hoveredItem.label}
          />
        );
      })()}

      {!isMobile && (
        <div className="sidebar-bottom-div" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: menuItems.length <= 4 ? '10px' : '8px', position: 'relative', zIndex: 2, paddingTop: menuItems.length <= 4 ? '8px' : '0', borderTop: menuItems.length <= 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          
          <button
            onClick={handleToggleNotif}
            title={notifPermission === 'granted' ? 'Notificaciones activadas' : 'Hacer clic para activar notificaciones'}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '8px',
              padding: isCollapsed ? '8px 0' : '8px 10px',
              background: notifPermission === 'granted' ? 'rgba(48, 209, 88, 0.08)' : 'rgba(17, 17, 17, 0.05)',
              border: notifPermission === 'granted' ? '1px solid rgba(48, 209, 88, 0.25)' : '1px solid rgba(17, 17, 17, 0.12)',
              borderRadius: '9px',
              color: notifPermission === 'granted' ? '#30d158' : 'rgba(17, 17, 17, 0.6)',
              cursor: notifPermission === 'granted' ? 'default' : 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'background 0.2s ease',
            }}
          >
            <Bell size={isCollapsed ? 15 : 13} /> {!isCollapsed && (notifPermission === 'granted' ? 'Notificaciones activas' : 'Activar notificaciones')}
          </button>

          {!isCollapsed && (
            <div
              onClick={() => setActiveTab('my-profile')}
              className="sidebar-profile-card"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px 12px', 
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.055)';
                e.currentTarget.style.borderColor = 'rgba(17, 17, 17,0.22)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              {/* Avatar with gold ring */}
              <div className="sidebar-profile-avatar" style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, rgba(17, 17, 17,0.25) 0%, rgba(100,80,50,0.15) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                border: '1.5px solid rgba(17, 17, 17,0.28)',
                boxShadow: '0 0 12px rgba(17, 17, 17,0.12)',
                flexShrink: 0,
              }}>
                {user?.image_url ? (
                  <img src={user.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={18} color="var(--champagne)" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sidebar-profile-name" style={{ 
                  fontSize: '12.5px', fontWeight: '700', color: '#f5f5f5',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  letterSpacing: '-0.2px',
                }}>
                  {user?.name || 'Dientes Sanos'}
                </div>
                <div className="sidebar-profile-role" style={{ 
                  fontSize: '9.5px', color: 'var(--champagne)', fontWeight: '600',
                  opacity: 0.65, marginTop: '1px',
                  textTransform: 'uppercase', letterSpacing: '0.6px',
                }}>
                  {userRoleName}
                </div>
              </div>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.18)', fontWeight: '700' }}>▼</span>
            </div>
          )}

          <button
            ref={logoutBtnRef}
            onClick={logout}
            onMouseEnter={e => {
              setIsLogoutHovered(true);
              e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)';
              e.currentTarget.style.border = '1px solid rgba(255, 69, 58, 0.35)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 69, 58, 0.15)';
              e.currentTarget.style.color = '#ff5a4e';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              setIsLogoutHovered(false);
              e.currentTarget.style.background = 'rgba(255, 69, 58, 0.04)';
              e.currentTarget.style.border = '1px solid rgba(255, 69, 58, 0.12)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.color = 'rgba(255, 80, 68, 0.7)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            className="sidebar-logout-btn"
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '8px', padding: isCollapsed ? '8px 0' : '8px 10px',
              background: 'rgba(255, 69, 58, 0.04)',
              border: '1px solid rgba(255, 69, 58, 0.12)',
              borderRadius: '9px',
              color: 'rgba(255, 80, 68, 0.7)',
              cursor: 'pointer', fontSize: '12px', fontWeight: '600',
              letterSpacing: '0.1px',
              transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
            }}
          >
            <LogOut size={isCollapsed ? 15 : 13} /> {!isCollapsed && "Cerrar Sesión"}
          </button>
          {isCollapsed && isLogoutHovered && (
            <SidebarTooltip targetRef={logoutBtnRef} label="Cerrar Sesión" danger />
          )}
        </div>
      )}    </div>
  );
};

export default Sidebar;
