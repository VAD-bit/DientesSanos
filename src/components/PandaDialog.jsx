import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import AnimatedModal from './AnimatedModal';

/**
 * PandaDialog - Un modal premium para reemplazar alerts, prompts y confirms nativos.
 */
const PandaDialog = ({ 
  isOpen, 
  title, 
  message, 
  type = 'prompt', // 'alert' | 'confirm' | 'prompt'
  inputValue = '',
  placeholder = '',
  onConfirm, 
  onCancel,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  danger = false,
  customFooter = null
}) => {
  const [val, setVal] = useState(inputValue);

  useEffect(() => {
    if (isOpen) setVal(inputValue);
  }, [isOpen, inputValue]);

  return (
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <div className={overlayClass.replace('global-modal-overlay', '')} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
        }}>
          <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{
            maxWidth: '420px',
            width: '100%',
            padding: '40px 32px 32px',
            borderRadius: '28px',
            border: danger ? '1px solid rgba(255, 59, 48, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: danger ? '0 30px 80px rgba(0,0,0,0.9), 0 0 40px rgba(255, 59, 48,0.1)' : '0 20px 60px rgba(0,0,0,0.8), 0 0 20px rgba(255, 255, 255,0.1)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {danger && (
              <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '250px', height: '120px', background: 'rgba(255,59,48,0.15)', filter: 'blur(50px)', zIndex: 0, pointerEvents: 'none' }} />
            )}

            {onCancel && (
              <button 
                onClick={onCancel} 
                style={{ 
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255,255,255,0.04)', 
                  border: 'none', 
                  color: 'rgba(255,255,255,0.5)', 
                  cursor: 'pointer', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  transition: 'all 0.2s',
                  zIndex: 10
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                <X size={16} />
              </button>
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
              {danger && (
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '20px', 
                  background: 'linear-gradient(135deg, rgba(255,59,48,0.2), rgba(0,0,0,0.5))', 
                  border: '1px solid rgba(255,59,48,0.3)',
                  boxShadow: 'inset 0 0 20px rgba(255,59,48,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <AlertTriangle size={32} color="#ff453a" style={{ filter: 'drop-shadow(0 0 8px rgba(255,69,58,0.5))' }} />
                </div>
              )}
              {title && <h3 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '12px', color: 'white', letterSpacing: '-0.5px' }}>{title}</h3>}
              {message && <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', marginBottom: '32px', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: '500' }}>{message}</p>}

              {type === 'prompt' && (
                <div style={{ marginBottom: '32px' }}>
                  <input 
                    autoFocus
                    className="form-input"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder={placeholder}
                    style={{ width: '100%', textAlign: 'center', fontSize: '16px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onConfirm(val);
                      if (e.key === 'Escape') onCancel();
                    }}
                  />
                </div>
              )}

              {customFooter ? (
                customFooter
              ) : (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: type === 'prompt' ? '0' : '8px' }}>
                  {(type === 'confirm' || type === 'prompt') && (
                    <button 
                      onClick={onCancel}
                      style={{ 
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.08)', 
                        color: 'rgba(255,255,255,0.7)', 
                        padding: '14px', 
                        borderRadius: '16px', 
                        fontWeight: '700', 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                    >
                      {cancelText}
                    </button>
                  )}
                  <button 
                    onClick={() => onConfirm(type === 'prompt' ? val : true)}
                    className={danger ? '' : 'btn-gold'} 
                    style={danger ? { 
                      flex: 1.5,
                      padding: '14px', 
                      borderRadius: '16px', 
                      fontWeight: '850', 
                      fontSize: '15px',
                      background: 'linear-gradient(180deg, rgba(255, 59, 48, 0.2), rgba(255, 59, 48, 0.1))',
                      color: '#ff453a',
                      border: '1px solid rgba(255, 59, 48, 0.4)',
                      boxShadow: '0 4px 15px rgba(255, 59, 48, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    } : { 
                      flex: 1.5,
                      padding: '14px', 
                      borderRadius: '16px', 
                      fontWeight: '850', 
                      fontSize: '15px'
                    }}
                    onMouseEnter={danger ? e => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 59, 48, 0.3), rgba(255, 59, 48, 0.15))' } : undefined}
                    onMouseLeave={danger ? e => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255, 59, 48, 0.2), rgba(255, 59, 48, 0.1))' } : undefined}
                  >
                    {confirmText}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AnimatedModal>
  );
};

export default PandaDialog;
