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
      backgroundColor: '#ffffff',
      color: '#111827',
      position: 'relative',
      className: 'admin-light-theme',
      overflow: 'hidden'
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
        backgroundColor: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        zIndex: 100,
        position: 'sticky',
        top: 0,
      }}>
        <div style={{ width: '40px' }} /> {/* Spacer */}
        <img src={logo} alt="Centro OdontolÃ³gico Dientes Sanos" style={{ height: '34px', width: 'auto', filter: 'brightness(0) invert(0) drop-shadow(0 0 8px rgba(0,0,0,0.15))' }} />
        <button 
          onClick={logout}
          type="button"
          aria-label="Cerrar sesiÃ³n"
          title="Cerrar sesiÃ³n"
          style={{ background: 'rgba(232, 212, 176, 0.12)', border: '1px solid rgba(232, 212, 176, 0.3)', borderRadius: '12px', color: '#92400e', padding: '11px', minWidth: '44px', minHeight: '44px', display: 'grid', placeItems: 'center', position: 'relative', zIndex: 102, cursor: 'pointer' }}
        >
          <LogOut size={20} />
        </button>
      </header>
      
      {/* Main content â€” scrollable area */}
      <div style={{
        flex: 1,
        padding: '10px 20px 100px 20px',
        minWidth: 0,
        backgroundColor: '#ffffff',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
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
          background-color: #ffffff;
          overflow: hidden;
        }
        html {
          overflow: hidden;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
        /* Allow scrolling within the main content area on iOS */
        .admin-light-theme > div:nth-child(2) {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </div>
  );
};

export default MobileLayout;

