import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';

const PandaDatePicker = ({ value, onChange, placeholder = "Seleccionar fecha", className = "", style = {}, min, max }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const [showYearSelect, setShowYearSelect] = useState(false);
  const containerRef = useRef(null);
  const yearScrollRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

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
      }, 180);
    }
    return () => clearTimeout(closeTimer.current);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      // Need to handle timezone offset if value is yyyy-mm-dd
      if (!isNaN(d.getTime())) {
        setCurrentMonth(new Date(d.getUTCFullYear(), d.getUTCMonth(), 1));
      }
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarWidth = 280;
      const calendarHeight = 330;
      const viewportPadding = 12;
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - calendarWidth - viewportPadding
      );

      if (spaceBelow < calendarHeight + 16) {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 8,
          left,
          zIndex: 999999,
          width: `${calendarWidth}px`,
          top: 'auto'
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 8,
          left,
          zIndex: 999999,
          width: `${calendarWidth}px`,
          bottom: 'auto'
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !event.target.closest('.panda-datepicker-dropdown')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event) => {
      if (event.target && event.target.closest && event.target.closest('.panda-datepicker-dropdown')) return;
      setIsOpen(false);
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleMonthChange = (e) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1));
  };

  const handleYearChange = (e) => {
    setCurrentMonth(new Date(parseInt(e.target.value), currentMonth.getMonth(), 1));
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 120 }, (_, i) => currentYear - 110 + i);

  const handleDateClick = (day) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const newDate = `${year}-${month}-${dayStr}`;
    
    onChange({ target: { value: newDate } });
    setIsOpen(false);
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '';
    const parts = dateString.split('-');
    if (parts.length < 3) return dateString;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const daysOfWeek = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Separar estilos de contenedor e input para evitar doble padding/bordes
  const { 
    width, 
    position, 
    zIndex, 
    top, 
    left, 
    right, 
    bottom, 
    margin, 
    marginTop, 
    marginBottom, 
    marginLeft, 
    marginRight,
    flex,
    gridColumn,
    gridRow,
    ...inputStyle 
  } = style;

  return (
    <div 
      className={`panda-datepicker-container ${className}`} 
      style={{ 
        position: position || 'relative', 
        zIndex: isOpen ? 999999 : (zIndex || 1), 
        width: width || '100%',
        top, left, right, bottom,
        margin, marginTop, marginBottom, marginLeft, marginRight,
        flex, gridColumn, gridRow
      }} 
      ref={containerRef}
    >
      <div 
        className="form-input focus-ring" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          padding: '0 16px',
          height: '48px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          color: value ? 'white' : 'rgba(255,255,255,0.4)',
          fontSize: '15px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...inputStyle,
          width: '100%'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarIcon size={18} color={value ? "var(--gold-primary)" : "rgba(255,255,255,0.4)"} style={{ flexShrink: 0, marginLeft: '8px' }} />
      </div>

      {mounted && createPortal(
        <div
          className={`glass-card panda-datepicker-dropdown ${closing ? 'animate-scale-out' : 'animate-scale-in'}`}
          style={{
            ...dropdownStyle,
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 15px rgba(255, 255, 255, 0.15)',
            pointerEvents: closing ? 'none' : 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={handlePrevMonth} className="action-btn" style={{ width: '32px', height: '32px' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: 'flex', gap: '8px', fontWeight: '700', fontSize: '14px', color: 'white', position: 'relative' }}>
              <div 
                onClick={(e) => { e.stopPropagation(); setShowMonthSelect(!showMonthSelect); setShowYearSelect(false); }}
                style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', background: showMonthSelect ? 'rgba(255,255,255,0.1)' : 'transparent', transition: 'all 0.2s' }}
                className="hover:bg-white/5"
              >
                {monthNames[currentMonth.getMonth()]}
              </div>
              <div 
                onClick={(e) => { e.stopPropagation(); setShowYearSelect(!showYearSelect); setShowMonthSelect(false); }}
                style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', background: showYearSelect ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'var(--gold-primary)', transition: 'all 0.2s' }}
                className="hover:bg-white/5"
              >
                {currentMonth.getFullYear()}
              </div>

              {showMonthSelect && (
                <div style={{ position: 'absolute', top: '100%', left: '-20px', marginTop: '8px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '4px', zIndex: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '180px' }}>
                  {monthNames.map((m, idx) => (
                    <button
                      key={m}
                      onClick={(e) => { e.stopPropagation(); handleMonthChange({ target: { value: idx }}); setShowMonthSelect(false); }}
                      style={{ padding: '8px', borderRadius: '8px', background: currentMonth.getMonth() === idx ? 'var(--gold-primary)' : 'transparent', color: currentMonth.getMonth() === idx ? '#000' : 'white', border: 'none', cursor: 'pointer', fontSize: '13px', textAlign: 'center', transition: 'all 0.2s' }}
                      className="hover:bg-white/10"
                    >
                      {m.slice(0,3)}
                    </button>
                  ))}
                </div>
              )}

              {showYearSelect && (
                <div 
                  style={{ position: 'absolute', top: '100%', right: '-20px', marginTop: '8px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', zIndex: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '220px', display: 'flex', flexDirection: 'column' }} 
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); if (yearScrollRef.current) yearScrollRef.current.scrollBy({ top: -120, behavior: 'smooth' }); }}
                    style={{ display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', paddingBottom: '4px', cursor: 'pointer' }}
                    className="hover:text-white"
                  >
                    <ChevronUp size={16} />
                  </div>
                  <div ref={yearScrollRef} className="hours-scroll-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '4px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {yearOptions.map(y => (
                      <button
                        key={y}
                        onClick={(e) => { e.stopPropagation(); handleYearChange({ target: { value: y }}); setShowYearSelect(false); }}
                        style={{ padding: '8px', borderRadius: '8px', background: currentMonth.getFullYear() === y ? 'var(--gold-primary)' : 'transparent', color: currentMonth.getFullYear() === y ? '#000' : 'white', border: 'none', cursor: 'pointer', fontSize: '13px', textAlign: 'center', transition: 'all 0.2s' }}
                        className="hover:bg-white/10"
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                  <div 
                    onClick={(e) => { e.stopPropagation(); if (yearScrollRef.current) yearScrollRef.current.scrollBy({ top: 120, behavior: 'smooth' }); }}
                    style={{ display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', paddingTop: '4px', cursor: 'pointer' }}
                    className="hover:text-white"
                  >
                    <ChevronDown size={16} />
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleNextMonth} className="action-btn" style={{ width: '32px', height: '32px' }}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', marginBottom: '8px' }}>
            {daysOfWeek.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--gold-primary)', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              // Basic min/max validation
              let isDisabled = false;
              if (min && dateStr < min) isDisabled = true;
              if (max && dateStr > max) isDisabled = true;

              return (
                <button
                  key={day}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isDisabled) handleDateClick(day);
                  }}
                  disabled={isDisabled}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    border: isSelected ? 'none' : (isToday ? '1px solid var(--gold-primary)' : 'none'),
                    background: isSelected ? 'var(--gold-gradient)' : 'transparent',
                    color: isSelected ? '#000' : (isDisabled ? 'rgba(255,255,255,0.2)' : 'white'),
                    fontWeight: isSelected ? '800' : '500',
                    fontSize: '13px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    margin: '0 auto'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isDisabled) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PandaDatePicker;
