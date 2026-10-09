import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  UserCircle, 
  Scissors, 
  Package, 
  Wallet, 
  Star,
  Calendar,
  History,
  ClipboardList,
  CreditCard,
  UserCheck,
  PieChart,
  MoreHorizontal,
  X,
  Bell,
  CheckCircle,
  Coffee,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { isSupportStaff } from '../../utils/staffRoles';

const MobileBottomNav = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() => notificationService.getPermissionStatus());

  const handleToggleNotif = async () => {
    if (notifPermission === 'granted') return;
    const res = await notificationService.requestPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      notificationService.sendNotification('🔔 Notificaciones Activadas', '¡Excelente! Ahora recibirás alertas en tiempo real.');
    }
  };

  const allMasterItems = [
    { id: 'panels', label: 'Paneles', icon: Scissors, roles: ['Admin'] },
    { id: 'barber', label: 'Mi sillón', icon: Scissors, roles: ['Admin', 'Barbero', 'Asistente de Lavado'] },
    { id: 'barista', label: 'Panel Barista', icon: Coffee, roles: ['Admin', 'Barista'] },
    { id: 'scheduling', label: 'Agenda', icon: Calendar, roles: ['Admin', 'Barbero', 'Recepcionista'] },
    { id: 'my-profile', label: 'Mi Perfil', icon: UserCircle, roles: ['Admin', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja'] },
    { id: 'dashboard', label: 'Inicio', icon: BarChart3, roles: ['Admin', 'Asistente de Lavado'] },
    { id: 'inventory', label: 'Stock', icon: Package, roles: ['Admin', 'Caja'] },
    { id: 'checkout', label: 'Caja', icon: CreditCard, roles: ['Admin', 'Caja'] },
    { id: 'reception', label: 'Recepción', icon: ClipboardList, roles: ['Admin', 'Recepcionista'] },
    { id: 'finance', label: 'Finanzas', icon: Wallet, roles: ['Admin', 'Caja'] },
    { id: 'personnel', label: 'Equipo', icon: UserCheck, roles: ['Admin'] },
    { id: 'reports', label: 'Reportes', icon: PieChart, roles: ['Admin'] },
    { id: 'services', label: 'Servicios', icon: Star, roles: ['Admin'] },
    { id: 'history', label: 'Historial', icon: History, roles: ['Admin', 'Barbero', 'Recepcionista', 'Caja', 'Asistente de Lavado'] },
    { id: 'settings', label: 'Ajustes', icon: Settings, roles: ['Admin'] },
  ];

  const userRole = user?.role || '';
  const [roleName, customPermsRaw = ''] = userRole.split('|');
  const customPerms = customPermsRaw.split(',').filter(Boolean);
  const isServiceProf = (roleName.toLowerCase().includes('odontolog') || roleName.toLowerCase().includes('barber') || roleName.toLowerCase().includes('tatu')) && roleName !== 'Admin';
  const isBarista = roleName.toLowerCase().includes('barista') || roleName.toLowerCase().includes('cafeter');
  const legacyFullAccess = ['dashboard', 'scheduling', 'reception', 'checkout', 'barber', 'clients', 'personnel', 'services', 'inventory', 'finance', 'history'].every(id => customPerms.includes(id));

  let mainItems = [];
  let secondaryItems = [];

  if (isBarista) {
    const allowed = item => item && (legacyFullAccess || item.id === 'barista' || customPerms.includes(item.id));
    const mainIds = ['barista', 'dashboard', 'checkout', 'inventory'];
    mainItems = mainIds.map(id => allMasterItems.find(i => i.id === id)).filter(allowed);
    secondaryItems = allMasterItems.filter(item => !mainIds.includes(item.id) && allowed(item));
  } else if (isServiceProf) {
    const mainIds = ['barber', 'scheduling', 'my-profile', 'clients'];
    mainItems = mainIds.map(id => allMasterItems.find(i => i.id === id)).filter(Boolean);
    secondaryItems = [allMasterItems.find(i => i.id === 'history')].filter(Boolean);
  } else if (isSupportStaff({ role: userRole })) {
    // Personal de apoyo (Editor, Marketing…): sin silla; su pantalla es su perfil.
    mainItems = [allMasterItems.find(i => i.id === 'my-profile')].filter(Boolean);
    secondaryItems = [];
  } else {
    const filterByPerms = (items) => items.filter(item => {
      if (roleName === 'Admin') return !['barber', 'barista'].includes(item.id);
      if (roleName === 'Asistente de Lavado') {
        return ['dashboard', 'history', 'barber', 'my-profile'].includes(item.id);
      }
      if (customPerms.length > 0) return customPerms.includes(item.id);
      return item.roles.includes(roleName);
    });

    const defaultMain = [
      allMasterItems.find(i => i.id === 'dashboard'),
      allMasterItems.find(i => i.id === 'clients'),
      allMasterItems.find(i => i.id === 'inventory'),
      allMasterItems.find(i => i.id === 'checkout'),
    ].filter(Boolean);

    const defaultSecondary = allMasterItems.filter(i => !['dashboard', 'clients', 'inventory', 'checkout'].includes(i.id));

    mainItems = filterByPerms(defaultMain);
    secondaryItems = filterByPerms(defaultSecondary);
  }

  const handleSelect = (id) => {
    setActiveTab(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(16px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'var(--bg-secondary)',
              zIndex: 998
            }}
          />
        )}
      </AnimatePresence>

      <div style={{ position: 'fixed', bottom: '24px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 1000, pointerEvents: 'none' }}>
        <AnimatePresence mode="wait">
          {!isMenuOpen ? (
            <motion.nav
              key="nav-pill"
              layoutId="dynamic-island"
              initial={{ borderRadius: 40 }}
              animate={{ borderRadius: 40 }}
              exit={{ borderRadius: 32 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              style={{
                backgroundColor: '#000',
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                gap: '4px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.15)',
                pointerEvents: 'auto',
                overflow: 'hidden'
              }}
            >
              {mainItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    layout
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: isActive ? '12px 20px' : '12px',
                      borderRadius: '30px',
                      border: 'none',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: isActive ? 'var(--gold-primary)' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      gap: '8px',
                      outline: 'none'
                    }}
                  >
                    <motion.div layout>
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </motion.div>
                    
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          layout
                          initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                          animate={{ opacity: 1, width: 'auto', marginLeft: 4 }}
                          exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          style={{
                            fontSize: '13px',
                            fontWeight: '800',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                          }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}

              <motion.button
                layout
                onClick={() => setIsMenuOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  borderRadius: '30px',
                  border: 'none',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <motion.div layout>
                  <MoreHorizontal size={22} strokeWidth={2} />
                </motion.div>
              </motion.button>
            </motion.nav>
          ) : (
            <motion.div
              key="nav-modal"
              layoutId="dynamic-island"
              initial={{ borderRadius: 32 }}
              animate={{ borderRadius: 32 }}
              exit={{ borderRadius: 40 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#000',
                width: 'calc(100% - 32px)',
                maxWidth: '420px',
                padding: '24px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.15)',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <motion.div layout style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'white' }}>Más Opciones</h3>
                <button onClick={() => setIsMenuOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </motion.div>

              <motion.button
                layout
                onClick={handleToggleNotif}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '20px',
                  background: notifPermission === 'granted' ? 'rgba(48, 209, 88, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: notifPermission === 'granted' ? '1px solid rgba(48, 209, 88, 0.3)' : '1px solid transparent',
                  color: notifPermission === 'granted' ? '#30d158' : 'white',
                  cursor: notifPermission === 'granted' ? 'default' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '800',
                  transition: 'background 0.2s ease, color 0.2s ease',
                  marginBottom: '24px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bell size={20} color={notifPermission === 'granted' ? '#30d158' : 'white'} />
                  <span>{notifPermission === 'granted' ? 'Notificaciones activas' : 'Activar notificaciones'}</span>
                </div>
                {notifPermission === 'granted' && (
                  <CheckCircle size={18} color="#30d158" />
                )}
              </motion.button>

              <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '20px 12px' }}>
                {secondaryItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <motion.button
                      layout
                      whileTap={{ scale: 0.9 }}
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '0',
                        color: isActive ? 'var(--gold-primary)' : 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '18px',
                        backgroundColor: isActive ? 'rgba(17, 17, 17, 0.15)' : 'rgba(255,255,255,0.06)',
                        border: isActive ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isActive ? '0 4px 16px rgba(17, 17, 17, 0.3)' : 'none',
                        transition: 'background-color 0.2s, box-shadow 0.2s'
                      }}>
                        <item.icon size={26} strokeWidth={isActive ? 2.5 : 1.5} />
                      </div>
                      <span style={{ fontSize: '11px', textAlign: 'center', fontWeight: isActive ? '800' : '600', letterSpacing: '0.2px' }}>
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default MobileBottomNav;
