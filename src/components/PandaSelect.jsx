import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

/**
 * PandaSelect - Un componente de selección premium que evita los estilos nativos de Windows.
 * El dropdown usa position:fixed para siempre renderizarse por encima de todo.
 */
const PandaSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleccionar...", 
  label = "",
  style = {},
  className = "",
  triggerStyle = {},
  dropdownClassName = "",
  menuStyle = {},
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const safeOptions = Array.isArray(options) ? options : [];

  // Keep the dropdown mounted briefly after close so the exit animation can play
  useEffect(() => {
    if (isOpen) {
      clearTimeout(closeTimer.current);
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      closeTimer.current = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 160);
    }
    return () => clearTimeout(closeTimer.current);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOption = safeOptions.find(opt => opt.value == value);

  // Calculate fixed position whenever dropdown opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownMaxH = 250;

      if (spaceBelow < dropdownMaxH + 16) {
        // Open upward
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999999,
          top: 'auto'
        });
      } else {
        // Open downward
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
          zIndex: 999999999,
          bottom: 'auto'
        });
      }
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        !event.target.closest('.panda-select-dropdown')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on scroll/resize to avoid stale position,
  // but NOT when scrolling inside the dropdown itself
  useEffect(() => {
    if (!isOpen) return;
    const close = (e) => {
      // Ignore scroll events that happen inside the dropdown
      if (e.target && e.target.closest && e.target.closest('.panda-select-dropdown')) return;
      setIsOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const renderOptionContent = (option, compact = false) => {
    if (!option) return placeholder;
    const hasAvatar = Boolean(option.imageUrl || option.avatarFallback || option.icon);
    if (!hasAvatar && !option.subtitle) return option.label;

    return (
      <span className={`panda-option-content ${compact ? 'is-compact' : ''}`}>
        {hasAvatar && (
          <span className="panda-option-avatar">
            {option.icon || <span>{option.avatarFallback || '?'}</span>}
            {option.imageUrl && (
              <img
                src={option.imageUrl}
                alt=""
                loading="lazy"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            )}
          </span>
        )}
        <span className="panda-option-copy">
          <strong>{option.label}</strong>
          {!compact && option.subtitle && <small>{option.subtitle}</small>}
        </span>
      </span>
    );
  };

  const dropdown = mounted ? (
    <div
      className={`panda-select-dropdown panda-scrollbar ${dropdownClassName}`.trim()}
      style={{
        ...dropdownStyle,
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
        maxHeight: '250px',
        overflowY: 'auto',
        padding: '8px',
        pointerEvents: closing ? 'none' : 'auto',
        animation: closing ? 'scaleOut 0.15s ease-in forwards' : 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: 'top center',
        ...menuStyle
      }}
    >
      {safeOptions.length === 0 ? (
        <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>Sin opciones</div>
      ) : (
        safeOptions.map((opt) => (
          <div
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              backgroundColor: value === opt.value ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: value === opt.value ? 'var(--gold-primary)' : 'white',
              transition: '0.2s',
              fontSize: '14px',
              fontWeight: value === opt.value ? '700' : '500',
              marginBottom: '2px'
            }}
            className={`panda-option ${value === opt.value ? 'selected' : ''}`}
          >
            {renderOptionContent(opt)}
          </div>
        ))
      )}
    </div>
  ) : null;

  return (
    <>
      <div
        className={`form-group ${className}`.trim()}
        style={{ position: 'relative', width: '100%', ...style, opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        ref={containerRef}
      >
        {label && (
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {label}
          </label>
        )}

        <div
          ref={triggerRef}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: isOpen ? '1px solid var(--gold-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 16px',
            borderRadius: '12px',
            color: selectedOption ? 'white' : 'var(--text-muted)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isOpen ? '0 0 0 4px rgba(255, 255, 255, 0.1)' : 'none',
            fontSize: '14px',
            userSelect: 'none',
            overflow: 'hidden',
            ...triggerStyle
          }}
        >
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedOption ? renderOptionContent(selectedOption, true) : placeholder}
          </span>
          <ChevronDown size={18} color="var(--gold-primary)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.3s', flexShrink: 0 }} />
        </div>
      </div>

      {/* Render dropdown via portal so it escapes all overflow/transform contexts */}
      {createPortal(
        <>
          {dropdown}
          <style>{`
            .panda-option:hover {
              background-color: rgba(255, 255, 255, 0.05) !important;
              transform: translateX(4px);
            }
            .panda-select-dropdown {
              border-radius: 16px !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
            .panda-option-content {
              display: flex;
              align-items: center;
              gap: 10px;
              min-width: 0;
              width: 100%;
            }
            .panda-option-avatar {
              position: relative;
              display: grid;
              width: 30px;
              height: 30px;
              flex: 0 0 30px;
              overflow: hidden;
              place-items: center;
              border: 1px solid rgba(17, 17, 17, 0.22);
              border-radius: 10px;
              background: rgba(17, 17, 17, 0.1);
              color: var(--gold-primary);
              font-size: 9px;
              font-weight: 900;
              box-sizing: border-box;
            }
            .panda-option-content.is-compact .panda-option-avatar {
              width: 26px;
              height: 26px;
              flex-basis: 26px;
              border-radius: 8px;
            }
            .panda-option-avatar img {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .panda-option-avatar > svg {
              width: 14px;
              height: 14px;
              color: currentColor;
              stroke-width: 2;
            }
            .panda-option-copy {
              display: flex;
              min-width: 0;
              flex: 1;
              flex-direction: column;
              gap: 1px;
            }
            .panda-option-copy strong {
              overflow: hidden;
              color: inherit;
              font-size: inherit;
              font-weight: inherit;
              line-height: 1.2;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .panda-option-copy small {
              overflow: hidden;
              color: rgba(255,255,255,0.38);
              font-size: 9px;
              font-weight: 650;
              line-height: 1.2;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          `}</style>
        </>,
        document.body
      )}
    </>
  );
};

export default PandaSelect;
