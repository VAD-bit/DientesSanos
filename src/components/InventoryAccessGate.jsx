import React, { useState, useEffect } from 'react';
import { LockKeyhole, Unlock, Delete } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';

const INVENTORY_PIN = '1111';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'panda_inventory_pin_attempts';

const getAttempts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, lastAttempt: 0 };
    return JSON.parse(raw);
  } catch { return { count: 0, lastAttempt: 0 }; }
};

const InventoryAccessGate = ({ children }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('idle');
  const [isClosing, setIsClosing] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(() => {
    const a = getAttempts();
    return (a.count >= MAX_ATTEMPTS && Date.now() - a.lastAttempt < LOCKOUT_MS)
      ? a.lastAttempt + LOCKOUT_MS : 0;
  });
  const [lockedSeconds, setLockedSeconds] = useState(0);

  useEffect(() => {
    if (!lockedUntil) { setLockedSeconds(0); return; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockedSeconds(remaining);
      if (remaining <= 0) setLockedUntil(0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Keyboard support for desktop users
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (unlocked || status !== 'idle' || lockedSeconds > 0) return;
      if (/^[0-9]$/.test(e.key)) {
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, status, unlocked, lockedSeconds]);

  const handlePress = (digit) => {
    if (status !== 'idle' || pin.length >= 4 || lockedSeconds > 0) return;
    const newPin = pin + digit;
    setPin(newPin);
    
    if (newPin.length === 4) {
      verifyPin(newPin);
    }
  };

  const handleDelete = () => {
    if (status !== 'idle' || pin.length === 0 || lockedSeconds > 0) return;
    setPin(pin.slice(0, -1));
  };

  const verifyPin = (currentPin) => {
    if (currentPin === INVENTORY_PIN) {
      localStorage.removeItem(STORAGE_KEY);
      setStatus('success');
      setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => setUnlocked(true), 400);
      }, 600);
    } else {
      const attempts = getAttempts();
      const newCount = attempts.count + 1;
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: newCount, lastAttempt: now }));

      if (newCount >= MAX_ATTEMPTS) {
        setLockedUntil(now + LOCKOUT_MS);
        notificationService.broadcastNotification(
          supabase,
          '⚠️ Intentos de PIN — Inventario',
          `Se intentó acceder al inventario ${newCount} veces con PIN incorrecto. Acceso bloqueado 5 minutos.`,
          { recipientRole: 'admin' }
        );
      }

      setStatus('error');
      setTimeout(() => {
        setPin('');
        setStatus('idle');
      }, 800);
    }
  };

  if (unlocked) return children;

  const dots = [0, 1, 2, 3];

  return (
    <main style={{ 
      minHeight: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '40px 20px',
      alignItems: 'center',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: isClosing ? 0 : 1,
      transform: isClosing ? 'scale(1.05)' : 'scale(1)'
    }}>
      <style>
        {`
          @keyframes pinShake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
          .pin-shake {
            animation: pinShake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          }
          .numpad-btn {
            width: 75px;
            height: 75px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #fff;
            font-size: 28px;
            font-weight: 300;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          .numpad-btn:active {
            transform: scale(0.9);
            background: rgba(255, 255, 255, 0.15);
          }
          @media (max-width: 400px) {
            .numpad-btn { width: 68px; height: 68px; font-size: 26px; }
          }
          @media (max-width: 350px) {
            .numpad-btn { width: 60px; height: 60px; font-size: 24px; }
          }
        `}
      </style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: '320px'
      }}>
        
        {/* Header Area */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ 
            width: '64px', height: '64px', margin: '0 auto 12px', 
            display: 'grid', placeItems: 'center', borderRadius: '50%', 
            color: status === 'success' ? '#30d158' : (status === 'error' ? '#ff453a' : 'var(--gold-primary)'), 
            background: status === 'success' ? 'rgba(48, 209, 88, 0.15)' : (status === 'error' ? 'rgba(255, 69, 58, 0.15)' : 'rgba(17, 17, 17, .11)'), 
            transition: 'all 0.3s ease',
            transform: status === 'success' ? 'scale(1.1)' : 'scale(1)'
          }}>
            {status === 'success' ? <Unlock size={30} /> : <LockKeyhole size={30} />}
          </div>
          <h1 style={{ margin: '0 0 8px', color: '#fff', fontSize: '24px', fontWeight: 600, letterSpacing: '0.5px' }}>
            Inventario Dientes Sanos
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
            {lockedSeconds > 0
              ? `Demasiados intentos. Espera ${lockedSeconds}s`
              : 'Ingresa el PIN para continuar'}
          </p>
        </div>

        {/* PIN Dots */}
        <div 
          className={status === 'error' ? 'pin-shake' : ''}
          style={{ 
            display: 'flex', 
            gap: '24px', 
            marginBottom: '35px',
            height: '20px',
            alignItems: 'center'
          }}
        >
          {dots.map(i => {
            const isFilled = i < pin.length;
            let bgColor = isFilled ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.15)';
            if (status === 'error') bgColor = '#ff453a';
            if (status === 'success') bgColor = '#30d158';
            if (lockedSeconds > 0) bgColor = 'rgba(255, 69, 58, 0.4)';
            
            return (
              <div key={i} style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: bgColor,
                transition: 'all 0.2s ease',
                transform: isFilled ? 'scale(1)' : 'scale(0.8)',
                boxShadow: isFilled && status === 'idle' ? '0 0 12px rgba(17, 17, 17, 0.5)' : 'none'
              }} />
            );
          })}
        </div>

        {/* Numpad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', width: '100%', placeItems: 'center', opacity: lockedSeconds > 0 ? 0.3 : 1, pointerEvents: lockedSeconds > 0 ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} className="numpad-btn" onClick={() => handlePress(num.toString())}>
              {num}
            </button>
          ))}
          
          <button className="numpad-btn" style={{ background: 'transparent', border: 'none', boxShadow: 'none', cursor: 'default' }} disabled>
            {/* Espacio vacío intencional para alinear el 0 */}
          </button>
          
          <button className="numpad-btn" onClick={() => handlePress('0')}>
            0
          </button>
          
          <button className="numpad-btn" onClick={handleDelete} style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <Delete size={30} strokeWidth={1.5} style={{ opacity: pin.length > 0 ? 0.9 : 0.2, transition: 'opacity 0.2s' }} />
          </button>
        </div>
      </div>
    </main>
  );
};

export default InventoryAccessGate;
