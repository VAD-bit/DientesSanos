import React, { useState, useCallback, useMemo } from 'react';
import { Eraser, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

// FDI (ISO 3950) - Dentición Permanente (adultos): cuadrantes 1-4, 8 piezas cada uno = 32
const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// FDI - Dentición Temporal (niños): cuadrantes 5-8, 5 piezas cada uno = 20
// No hay premolares en dentición temporal
const TEMPORARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const TEMPORARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const SURFACES = [
  { key: 'V', label: 'Vestibular' },
  { key: 'L', label: 'Lingual/Palatina' },
  { key: 'M', label: 'Mesial' },
  { key: 'D', label: 'Distal' },
  { key: 'O', label: 'Oclusal/Incisal' }
];

const CONDITIONS = [
  { id: 'caries', label: 'Caries', color: '#ef4444', kind: 'surface', circle: true },
  { id: 'rest_def', label: 'Rest. Definitiva', color: '#3b82f6', kind: 'surface', circle: true, materials: ['AM', 'R', 'IV', 'IM', 'IE', 'CP'] },
  { id: 'sellante', label: 'Sellante', color: '#3b82f6', kind: 'surface', fill: true },
  { id: 'rest_temp', label: 'Rest. Temporal', color: '#f97316', kind: 'surface', circle: true },
  { id: 'corona_temp', label: 'Corona Temporal', color: '#ef4444', kind: 'tooth', ring: true },
  { id: 'corona_def', label: 'Corona Definitiva', color: '#3b82f6', kind: 'tooth', ring: true, materials: ['CC', 'CF', 'CMC'] },
  { id: 'ausente', label: 'Ausente / Extraído', color: '#6b7280', kind: 'tooth', cross: true },
  { id: 'endodoncia', label: 'Endodoncia', color: '#8b5cf6', kind: 'tooth', rootLine: true },
  { id: 'erupcion', label: 'En erupción', color: '#22c55e', kind: 'tooth', outline: true },
];

const MATERIAL_LABELS = {
  AM: 'Amalgama',
  R: 'Resina',
  IV: 'Incrustación de Vidrio',
  IM: 'Incrustación Metálica',
  IE: 'Incrustación Estética',
  CP: 'Corona de Porcelana',
  CC: 'Corona Metálica',
  CF: 'Corona Fija',
  CMC: 'Corona Metálica Revestida'
};

// Determina si un diente es temporal (cuadrantes 5-8)
function isTemporaryTooth(num) {
  const quad = Math.floor(num / 10);
  return quad >= 5 && quad <= 8;
}

// Determina si un diente es permanente (cuadrantes 1-4)
function isPermanentTooth(num) {
  const quad = Math.floor(num / 10);
  return quad >= 1 && quad <= 4;
}

// Tamaño del diente según tipo y posición
function toothSize(num) {
  const isTemp = isTemporaryTooth(num);
  const pos = num % 10;
  
  if (isTemp) {
    // Dientes temporales: 51-55, 61-65, 71-75, 81-85
    // 1-2: incisivos, 3: canino, 4-5: molares
    if (pos === 5 || pos === 4) return { w: 30, h: 30 }; // molares temporales
    if (pos === 3) return { w: 24, h: 30 }; // canino temporal
    return { w: 20, h: 28 }; // incisivos temporales
  }
  
  // Dientes permanentes
  if (pos >= 1 && pos <= 3) return { w: 32, h: 34 }; // molares
  if (pos === 4 || pos === 5) return { w: 28, h: 32 }; // premolares
  if (pos === 6) return { w: 24, h: 34 }; // canino
  return { w: 22, h: 32 }; // incisivos
}

// Agrupa dientes por cuadrante para layout
function groupByQuadrant(teeth) {
  const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };
  for (const t of teeth) {
    const quad = Math.floor(t / 10);
    if (groups[quad]) groups[quad].push(t);
  }
  return groups;
}

// Slot fijo por pieza
const TOOTH_SLOT = 38;
const ARCH_GAP = 6; // gap entre cuadrantes (línea media)
const VIEW_W = 16 * TOOTH_SLOT + ARCH_GAP + 16;
const MID_X = 8 * TOOTH_SLOT + ARCH_GAP / 2;

export default function Odontograma({ value, onChange }) {
  const marks = useMemo(() => (Array.isArray(value?.marks) ? value.marks : []), [value]);
  const [activeCond, setActiveCond] = useState('caries');
  const [activeMat, setActiveMat] = useState('R');
  const [eraser, setEraser] = useState(false);
  const [viewMode, setViewMode] = useState('mixed'); // 'permanent' | 'temporary' | 'mixed'
  const [showTemp, setShowTemp] = useState(false); // toggle para mostrar temporales en vista mixta

  const cond = CONDITIONS.find(c => c.id === activeCond);

  const emit = useCallback((nextMarks) => {
    onChange({ marks: nextMarks });
  }, [onChange]);

  const handleSurfaceClick = useCallback((tooth, surface) => {
    if (eraser) {
      emit(marks.filter(m => !(m.tooth === tooth && m.surface === surface)));
      return;
    }
    if (!cond) return;
    if (cond.kind === 'tooth') return;

    const existing = marks.find(m => m.tooth === tooth && m.surface === surface && m.type === cond.id);
    if (existing) {
      if (cond.materials && existing.mat !== activeMat) {
        emit(marks.map(m => (m === existing ? { ...m, mat: activeMat } : m)));
      } else {
        emit(marks.filter(m => m !== existing));
      }
      return;
    }
    const next = marks.filter(m => !(m.tooth === tooth && m.surface === surface && m.type !== cond.id));
    const entry = { tooth, surface, type: cond.id };
    if (cond.materials) entry.mat = activeMat;
    emit([...next, entry]);
  }, [activeMat, cond, eraser, emit, marks]);

  const handleToothClick = useCallback((tooth) => {
    if (eraser) {
      emit(marks.filter(m => m.tooth !== tooth));
      return;
    }
    if (!cond || cond.kind !== 'tooth') return;
    const existing = marks.find(m => m.tooth === tooth && m.type === cond.id);
    if (existing) {
      if (cond.materials && existing.mat !== activeMat) {
        emit(marks.map(m => (m === existing ? { ...m, mat: activeMat } : m)));
      } else {
        emit(marks.filter(m => m !== existing));
      }
      return;
    }
    const next = marks.filter(m => !(m.tooth === tooth && m.type === cond.id));
    const entry = { tooth, type: cond.id };
    if (cond.materials) entry.mat = activeMat;
    emit([...next, entry]);
  }, [activeMat, cond, eraser, emit, marks]);

  const clearAll = () => emit([]);

  const marksForTooth = useCallback((tooth) => marks.filter(m => m.tooth === tooth), [marks]);

  // Dientes según vista actual
  const getCurrentTeeth = () => {
    if (viewMode === 'permanent') {
      return { upper: PERMANENT_UPPER, lower: PERMANENT_LOWER };
    } else if (viewMode === 'temporary') {
      return { upper: TEMPORARY_UPPER, lower: TEMPORARY_LOWER };
    } else { // mixed
      return { 
        upper: [...PERMANENT_UPPER, ...TEMPORARY_UPPER], 
        lower: [...PERMANENT_LOWER, ...TEMPORARY_LOWER] 
      };
    }
  };

  const { upper: currentUpper, lower: currentLower } = getCurrentTeeth();

  const renderTooth = (num, isUpper) => {
    const { w, h } = toothSize(num);
    const tMarks = marksForTooth(num);
    const coronaDef = tMarks.find(m => m.type === 'corona_def');
    const coronaTemp = tMarks.find(m => m.type === 'corona_temp');
    const ausente = tMarks.find(m => m.type === 'ausente');
    const endodoncia = tMarks.find(m => m.type === 'endodoncia');
    const erupcion = tMarks.find(m => m.type === 'erupcion');
    
    const ringColor = coronaDef
      ? '#3b82f6'
      : coronaTemp
        ? '#ef4444'
        : null;
    const ringMat = coronaDef?.mat || coronaTemp?.mat;

    const surfMarks = {};
    for (const s of SURFACES) {
      surfMarks[s.key] = tMarks.filter(m => m.surface === s.key);
    }

    const pad = 2;
    const isTemp = isTemporaryTooth(num);

    const surfaceBox = (key, x, y, sw, sh) => {
      const list = surfMarks[key] || [];
      const primary = list.find(m => m.type === activeCond) || list[0];
      const cDef = primary ? CONDITIONS.find(c => c.id === primary.type) : null;
      const color = cDef?.color || '#666';
      const isFill = cDef?.fill;
      const isCircle = cDef?.circle;
      const mat = primary?.mat;

      return (
        <g key={key} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleSurfaceClick(num, key); }}>
          <rect x={x} y={y} width={sw} height={sh} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" />
          {isFill && (
            <rect x={x + 1.5} y={y + 1.5} width={sw - 3} height={sh - 3} rx="2" fill={color} opacity="0.85" />
          )}
          {isCircle && (
            <circle cx={x + sw / 2} cy={y + sh / 2} r={Math.min(sw, sh) * 0.32} fill="none" stroke={color} strokeWidth="1.6" />
          )}
          {mat && (
            <text
              x={x + sw / 2}
              y={y + sh / 2 + 2.2}
              textAnchor="middle"
              fontSize={sw > 14 ? 6.5 : 5.5}
              fontWeight="800"
              fill={color}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {mat}
            </text>
          )}
          {list.length > 1 && (
            <circle cx={x + sw - 2.5} cy={y + 2.5} r="1.6" fill="#e8d4b0" style={{ pointerEvents: 'none' }} />
          )}
        </g>
      );
    };

    const bx = pad;
    const by = pad + 12;
    const midW = Math.min(w * 0.38, 12);
    const midH = Math.min(h * 0.38, 12);
    const leftW = (w - midW) / 2;
    const rightW = leftW;
    const topH = (h - midH) / 2;
    const botH = topH;

    return (
      <g
        key={num}
        onClick={() => handleToothClick(num)}
        style={{ cursor: cond?.kind === 'tooth' || eraser ? 'pointer' : 'default' }}
      >
        {/* número FDI */}
        <text
          x={bx + w / 2}
          y={isUpper ? by - 3 : by + h + 12}
          textAnchor="middle"
          fontSize={isTemp ? "8" : "9"}
          fontWeight="800"
          fill={isTemp ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.55)"}
          style={{ userSelect: 'none' }}
        >
          {num}
        </text>

        {/* corona (anillo) */}
        {(coronaDef || coronaTemp) && (
          <rect
            x={bx - 1.5}
            y={by - 1.5}
            width={w + 3}
            height={h + 3}
            rx="5"
            fill="none"
            stroke={ringColor}
            strokeWidth="2.2"
            opacity="0.95"
          />
        )}
        {ringMat && (
          <text
            x={bx + w / 2}
            y={isUpper ? by + h + 11 : by - 3}
            textAnchor="middle"
            fontSize="7"
            fontWeight="800"
            fill={ringColor}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {ringMat}
          </text>
        )}

        {/* Ausente - X grande */}
        {ausente && (
          <g stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
            <line x1={bx + 3} y1={by + 3} x2={bx + w - 3} y2={by + h - 3} />
            <line x1={bx + w - 3} y1={by + 3} x2={bx + 3} y2={by + h - 3} />
          </g>
        )}

        {/* Endodoncia - línea vertical en raíz */}
        {endodoncia && (
          <line
            x1={bx + w / 2}
            y1={isUpper ? by + h : by}
            x2={bx + w / 2}
            y2={isUpper ? by + h + 18 : by - 18}
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* En erupción - contorno punteado */}
        {erupcion && (
          <rect
            x={bx - 2}
            y={by - 2}
            width={w + 4}
            height={h + 4}
            rx="5"
            fill="none"
            stroke="#22c55e"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />
        )}

        {/* superficies */}
        {!ausente && (
          <>
            {surfaceBox('V', bx + leftW, by, midW, topH)}
            {surfaceBox('M', bx, by + topH, leftW, midH)}
            {surfaceBox('O', bx + leftW, by + topH, midW, midH)}
            {surfaceBox('D', bx + leftW + midW, by + topH, rightW, midH)}
            {surfaceBox('L', bx + leftW, by + topH + midH, midW, botH)}
          </>
        )}
      </g>
    );
  };

  // Renderiza una arcada (superior o inferior) agrupada por cuadrantes
  const renderArch = (teeth, isUpper, yOffset) => {
    const groups = groupByQuadrant(teeth);
    const quadrantOrder = isUpper ? [1, 2, 5, 6] : [4, 3, 8, 7]; // orden visual: der → izq
    
    return (
      <g transform={`translate(8, ${yOffset})`}>
        {quadrantOrder.map((quad) => {
          const quadTeeth = groups[quad] || [];
          if (quadTeeth.length === 0) return null;
          
          const isRightSide = (isUpper && (quad === 1 || quad === 5)) || (!isUpper && (quad === 4 || quad === 8));
          const isLeftSide = (isUpper && (quad === 2 || quad === 6)) || (!isUpper && (quad === 3 || quad === 7));
          
          // Calcular offset X para este cuadrante
          let quadIndex = 0;
          if (isUpper) {
            if (quad === 1) quadIndex = 0;
            else if (quad === 2) quadIndex = 8;
            else if (quad === 5) quadIndex = 0;
            else if (quad === 6) quadIndex = 8;
          } else {
            if (quad === 4) quadIndex = 0;
            else if (quad === 3) quadIndex = 8;
            else if (quad === 8) quadIndex = 0;
            else if (quad === 7) quadIndex = 8;
          }
          
          const baseX = quadIndex * TOOTH_SLOT + (isLeftSide ? ARCH_GAP : 0);
          
          return (
            <g key={quad} transform={`translate(${baseX}, 0)`}>
              {quadTeeth.map((n, i) => {
                const { w } = toothSize(n);
                const x = i * TOOTH_SLOT + (TOOTH_SLOT - w) / 2;
                return (
                  <g key={n} transform={`translate(${x}, 0)`}>
                    {renderTooth(n, isUpper)}
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    );
  };

  const summary = useMemo(() => {
    const byType = {};
    for (const m of marks) {
      const k = m.type + (m.mat ? ` ${m.mat}` : '');
      byType[k] = (byType[k] || 0) + 1;
    }
    return Object.entries(byType).map(([k, n]) => `${n}× ${k}`).join(' · ');
  }, [marks]);

  // Contar dientes por tipo en la vista actual
  const tempCount = marks.filter(m => isTemporaryTooth(m.tooth)).length;
  const permCount = marks.filter(m => isPermanentTooth(m.tooth)).length;

  return (
    <div style={styles.wrap}>
      {/* Selector de vista */}
      <div style={styles.viewSelector}>
        <button
          type="button"
          onClick={() => setViewMode('permanent')}
          style={{
            ...styles.viewBtn,
            background: viewMode === 'permanent' ? '#e8d4b0' : 'rgba(255,255,255,0.05)',
            color: viewMode === 'permanent' ? '#111' : 'rgba(255,255,255,0.8)',
            borderColor: viewMode === 'permanent' ? '#e8d4b0' : 'rgba(255,255,255,0.12)',
          }}
        >
          <span style={{fontSize: '11px', fontWeight: '800'}}>Permanente</span>
          <span style={{fontSize: '10px', opacity: 0.7}}>(32 piezas)</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('temporary')}
          style={{
            ...styles.viewBtn,
            background: viewMode === 'temporary' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
            color: viewMode === 'temporary' ? '#fff' : 'rgba(255,255,255,0.8)',
            borderColor: viewMode === 'temporary' ? '#3b82f6' : 'rgba(255,255,255,0.12)',
          }}
        >
          <span style={{fontSize: '11px', fontWeight: '800'}}>Temporal</span>
          <span style={{fontSize: '10px', opacity: 0.7}}>(20 piezas)</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('mixed')}
          style={{
            ...styles.viewBtn,
            background: viewMode === 'mixed' ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
            color: viewMode === 'mixed' ? '#fff' : 'rgba(255,255,255,0.8)',
            borderColor: viewMode === 'mixed' ? '#8b5cf6' : 'rgba(255,255,255,0.12)',
          }}
        >
          <span style={{fontSize: '11px', fontWeight: '800'}}>Mixta</span>
          <span style={{fontSize: '10px', opacity: 0.7}}>(52 piezas)</span>
        </button>
      </div>

      {/* Paleta de herramientas */}
      <div style={styles.palette}>
        <div style={styles.paletteRow}>
          {CONDITIONS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { setActiveCond(c.id); setEraser(false); if (c.materials && !c.materials.includes(activeMat)) setActiveMat(c.materials[0]); }}
              style={{
                ...styles.condBtn,
                borderColor: activeCond === c.id && !eraser ? c.color : 'rgba(255,255,255,0.10)',
                background: activeCond === c.id && !eraser ? `${c.color}22` : 'rgba(255,255,255,0.03)',
                boxShadow: activeCond === c.id && !eraser ? `0 0 0 1px ${c.color}` : 'none'
              }}
            >
              <span style={{ ...styles.swatch, background: c.color, borderRadius: c.fill ? '2px' : c.cross ? '0' : c.outline ? '0' : c.rootLine ? '0' : '50%' }} />
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEraser(true)}
            style={{
              ...styles.condBtn,
              borderColor: eraser ? '#e8d4b0' : 'rgba(255,255,255,0.10)',
              background: eraser ? 'rgba(232,212,176,0.15)' : 'rgba(255,255,255,0.03)'
            }}
          >
            <Eraser size={13} color={eraser ? '#e8d4b0' : 'rgba(255,255,255,0.6)'} />
            Borrar
          </button>
        </div>

        {cond?.materials && !eraser && (
          <div style={styles.paletteRow}>
            <span style={styles.matLabel}>Material:</span>
            {cond.materials.map(m => (
              <button
                key={m}
                type="button"
                title={MATERIAL_LABELS[m] || m}
                onClick={() => setActiveMat(m)}
                style={{
                  ...styles.matBtn,
                  background: activeMat === m ? cond.color : 'rgba(255,255,255,0.05)',
                  color: activeMat === m ? '#fff' : 'rgba(255,255,255,0.75)',
                  borderColor: activeMat === m ? cond.color : 'rgba(255,255,255,0.12)'
                }}
              >
                {m}
              </button>
            ))}
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginLeft: '4px' }}>
              {MATERIAL_LABELS[activeMat] || activeMat}
            </span>
          </div>
        )}

        <div style={styles.hint}>
          {eraser
            ? 'Borrador activo: toca una superficie o diente para quitar marcas.'
            : `Selecciona ${cond?.label?.toLowerCase() || 'una condición'}${cond?.materials ? ` (${activeMat} — ${MATERIAL_LABELS[activeMat] || activeMat})` : ''} y toca las caras del diente${cond?.kind === 'tooth' ? ' o el diente completo' : ''}. Tocar de nuevo = alternar/quitar.`}
        </div>
      </div>

      {/* Odontograma */}
      <div style={styles.chartBox} className="panda-scrollbar">
        <svg
          viewBox={`0 0 ${VIEW_W} 280`}
          width="100%"
          style={{ maxWidth: `${VIEW_W}px`, minWidth: '520px', display: 'block', margin: '0 auto' }}
        >
          {/* línea media */}
          <line
            x1={MID_X}
            y1="6"
            x2={MID_X}
            y2="270"
            stroke="rgba(232,212,176,0.84)"
            strokeDasharray="4 3"
            strokeWidth="1"
          />

          {/* Superior */}
          {renderArch(currentUpper, true, 10)}

          {/* Inferior */}
          {renderArch(currentLower, false, 145)}

          {/* etiquetas de cuadrante - dinámicas según vista */}
          {viewMode === 'permanent' && (
            <>
              <text x={MID_X / 2} y="272" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.32)" fontWeight="700">
                SUP · DER 18–11 | IZQ 21–28
              </text>
              <text x={MID_X + (VIEW_W - MID_X) / 2} y="272" textAnchor="middle" fontSize="9" fill="rgba(188,203,197,0.86)" fontWeight="700">
                INF · DER 48–41 | IZQ 31–38
              </text>
            </>
          )}
          {viewMode === 'temporary' && (
            <>
              <text x={MID_X / 2} y="272" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.32)" fontWeight="700">
                SUP · DER 55–51 | IZQ 61–65
              </text>
              <text x={MID_X + (VIEW_W - MID_X) / 2} y="272" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.32)" fontWeight="700">
                INF · DER 85–81 | IZQ 71–75
              </text>
            </>
          )}
          {viewMode === 'mixed' && (
            <>
              <text x={MID_X / 2} y="272" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.32)" fontWeight="700">
                SUP · DER 18–11, 55–51 | IZQ 21–28, 61–65
              </text>
              <text x={MID_X + (VIEW_W - MID_X) / 2} y="272" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.32)" fontWeight="700">
                INF · DER 48–41, 85–81 | IZQ 31–38, 71–75
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Leyenda (simbología clínica) */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>Simbología del odontograma (FDI)</div>
        <div style={styles.legendGrid}>
          {CONDITIONS.map(c => (
            <div key={c.id} style={styles.legendItem}>
              <svg width="22" height="22" viewBox="0 0 22 22">
                <rect x="1" y="1" width="20" height="20" rx="3" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
                {c.kind === 'surface' && c.circle && (
                  <circle cx="11" cy="11" r="6" fill="none" stroke={c.color} strokeWidth="2" />
                )}
                {c.fill && (
                  <rect x="5" y="5" width="12" height="12" rx="2" fill={c.color} opacity="0.9" />
                )}
                {c.ring && (
                  <rect x="3" y="3" width="16" height="16" rx="3" fill="none" stroke={c.color} strokeWidth="2.2" />
                )}
                {c.cross && (
                  <g stroke={c.color} strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="5" x2="17" y2="17" />
                    <line x1="17" y1="5" x2="5" y2="17" />
                  </g>
                )}
                {c.rootLine && (
                  <line x1="11" y1="16" x2="11" y2="4" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" />
                )}
                {c.outline && (
                  <rect x="3" y="3" width="16" height="16" rx="3" fill="none" stroke={c.color} strokeWidth="1.5" strokeDasharray="4 3" />
                )}
              </svg>
              <div>
                <div style={styles.legendLabel}>{c.label}</div>
                {c.materials && (
                  <div style={styles.legendMats}>{c.materials.join(' · ')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={styles.legendNote}>
          Círculo en la cara = lesión/restauración en esa superficie (V, L, M, D, O). Anillo = corona. X = ausente/extraído. Línea vertical = endodoncia. Contorno punteado = en erupción.
          {viewMode === 'mixed' && ' • Dentición mixta: permanentes (cuadrantes 1–4) + temporales (5–8). El 1er molar definitivo (16, 26, 36, 46) erupciona detrás del 2º molar temporal (55, 65, 75, 85).'}
        </div>
      </div>

      {/* Resumen + acciones */}
      <div style={styles.toolbar}>
        <span style={styles.summary}>
          {marks.length === 0 ? 'Sin marcas en el odontograma' : `${marks.length} marca(s)${tempCount ? ` (${tempCount} temporales)` : ''}${permCount ? ` (${permCount} permanentes)` : ''}: ${summary}`}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => setEraser(v => !v)} style={styles.toolBtn} title="Alternar borrador">
            <Eraser size={13} /> {eraser ? 'Salir borrador' : 'Borrador'}
          </button>
          <button type="button" onClick={clearAll} style={styles.toolBtn} title="Limpiar todo el odontograma">
            <Trash2 size={13} /> Limpiar todo
          </button>
        </div>
      </div>
      
      {/* Acciones por grupo */}
      <div style={styles.quadRow}>
        {viewMode !== 'temporary' && (
          <>
            <button type="button" onClick={() => emit(marks.filter(m => m.tooth < 20 || m.tooth > 29))} style={styles.quadBtn}>
              Limpiar sup. permanente (11–28)
            </button>
            <button type="button" onClick={() => emit(marks.filter(m => m.tooth < 30 || m.tooth > 39))} style={styles.quadBtn}>
              Limpiar inf. permanente (31–48)
            </button>
          </>
        )}
        {viewMode !== 'permanent' && (
          <>
            <button type="button" onClick={() => emit(marks.filter(m => m.tooth < 50 || m.tooth > 69))} style={styles.quadBtn}>
              Limpiar sup. temporal (51–65)
            </button>
            <button type="button" onClick={() => emit(marks.filter(m => m.tooth < 70 || m.tooth > 89))} style={styles.quadBtn}>
              Limpiar inf. temporal (71–85)
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => emit(marks.filter(m => m.type !== 'corona_def' && m.type !== 'corona_temp'))}
          style={styles.quadBtn}
        >
          Quitar coronas
        </button>
        <button
          type="button"
          onClick={() => emit(marks.filter(m => m.type !== 'ausente'))}
          style={styles.quadBtn}
        >
          Quitar ausencias
        </button>
        <button
          type="button"
          onClick={() => emit(marks.filter(m => m.type !== 'endodoncia'))}
          style={styles.quadBtn}
        >
          Quitar endodoncias
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '12px' },
  viewSelector: {
    display: 'flex', gap: '8px', padding: '8px',
    background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
    border: '1px solid rgba(0,0,0,0.06)'
  },
  viewBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    padding: '8px 4px', borderRadius: '8px', border: '1px solid', fontWeight: '700',
    cursor: 'pointer', transition: 'all 0.2s'
  },
  palette: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    padding: '12px', borderRadius: '14px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0, 0, 0, 0.08)'
  },
  paletteRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  condBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 10px', borderRadius: '10px', border: '1.5px solid rgba(0, 0, 0, 0.08)',
    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.85)',
    fontSize: '11.5px', fontWeight: '700', cursor: 'pointer'
  },
  swatch: { width: '10px', height: '10px', display: 'inline-block', border: '1.5px solid currentColor' },
  matLabel: { fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginRight: '4px' },
  matBtn: {
    padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(0, 0, 0, 0.08)',
    fontSize: '12px', fontWeight: '800', cursor: 'pointer', letterSpacing: '0.3px'
  },
  hint: { fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 },
  chartBox: {
    padding: '10px 6px', borderRadius: '14px',
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0, 0, 0, 0.08)',
    overflowX: 'auto'
  },
  legend: {
    padding: '12px', borderRadius: '14px',
    background: 'rgba(232,212,176,0.06)', border: '1px solid rgba(232,212,176,0.18)'
  },
  legendTitle: {
    fontSize: '11px', fontWeight: '900', textTransform: 'uppercase',
    letterSpacing: '0.6px', color: '#e8d4b0', marginBottom: '10px'
  },
  legendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '8px' },
  legendLabel: { fontSize: '12px', fontWeight: '700', color: '#f5f5f5' },
  legendMats: { fontSize: '10px', color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  legendNote: { marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 },
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '10px', flexWrap: 'wrap'
  },
  summary: { fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  toolBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '7px 12px', borderRadius: '10px',
    border: '1px solid rgba(0, 0, 0, 0.08)', background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
  },
  quadRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' },
  quadBtn: {
    padding: '6px 10px', borderRadius: '8px', border: '1px dashed rgba(0, 0, 0, 0.08)',
    background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
  }
};