import React, { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from './MobileBottomNav';
import logo from '../../assets/sidebar_logo.png';

const MobileLayout = ({ children, activeTab, setActiveTab, onOpenSale }) => {
  const { logout } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      color: 'white',
      position: 'relative',
    }}>
      {/* Sticky Brand Header */}
      <header style={{ 
        flexShrink: 0,
        minHeight: '60px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: 'max(env(safe-area-inset-top, 0px), 10px) 20px 8px',
        boxSizing: 'content-box',
        backgroundColor: 'var(--bg-primary)',
        zIndex: 100,
        position: 'sticky',
        top: 0,
      }}>
        <div style={{ width: '40px' }} /> {/* Spacer */}
        <img src={logo} alt="Centro Odontológico Dientes Sanos" style={{ height: '34px', width: 'auto', filter: 'brightness(1.05)' }} />
        <button 
          onClick={logout}
          type="button"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          style={{ background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.18)', borderRadius: '12px', color: '#ff453a', padding: '11px', minWidth: '44px', minHeight: '44px', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 102, cursor: 'pointer' }}
        >
          <LogOut size={20} />
        </button>
      </header>
      
      {/* Main content — the document owns vertical scrolling on mobile */}
      <div style={{
        flex: 1,
        padding: '10px 20px 100px 20px',
        minWidth: 0,
      }}>
        {children}
      </div>

      <MobileBottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSale={onOpenSale} 
      />

      <style>{`
        body {
          background-color: var(--bg-primary);
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default MobileLayout;
