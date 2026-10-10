import React, { useState, useCallback, useMemo } from 'react';
import { Eraser, Trash2 } from 'lucide-react';

// FDI (ISO 3950): cuadrantes 1-4, 8 piezas cada uno
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

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
  { id: 'corona_def', label: 'Corona Definitiva', color: '#3b82f6', kind: 'tooth', ring: true, materials: ['CC', 'CF', 'CMC'] }
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

function toothSize(num) {
  const pos = num % 10;
  if (pos >= 1 && pos <= 3) return { w: 30, h: 32 }; // molares
  if (pos === 4 || pos === 5) return { w: 26, h: 30 }; // premolares
  if (pos === 6) return { w: 22, h: 32 }; // canino
  return { w: 20, h: 30 }; // incisivos
}

export default function Odontograma({ value, onChange }) {
  const marks = useMemo(() => (Array.isArray(value?.marks) ? value.marks : []), [value]);
  const [activeCond, setActiveCond] = useState('caries');
  const [activeMat, setActiveMat] = useState('R');
  const [eraser, setEraser] = useState(false);

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
    if (cond.kind === 'tooth') return; // coronas se marcan desde el diente

    const existing = marks.find(m => m.tooth === tooth && m.surface === surface && m.type === cond.id);
    if (existing) {
      // si tiene materiales y no está en el activo, cambiar material; si está, quitar
      if (cond.materials && existing.mat !== activeMat) {
        emit(marks.map(m => (m === existing ? { ...m, mat: activeMat } : m)));
      } else {
        emit(marks.filter(m => m !== existing));
      }
      return;
    }
    // quitar otro tipo de marca en la misma superficie del mismo "grupo" visual
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

  const renderTooth = (num, isUpper) => {
    const { w, h } = toothSize(num);
    const tMarks = marksForTooth(num);
    const coronaDef = tMarks.find(m => m.type === 'corona_def');
    const coronaTemp = tMarks.find(m => m.type === 'corona_temp');
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
          <rect x={x} y={y} width={sw} height={sh} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
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

    // Layout cruces: V arriba/abajo según arco, M izq, O centro, D der, L opuesto a V
    const bx = pad;
    const by = pad + 12; // debajo del número en superior; en inferior el número va arriba
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
          y={isUpper ? by - 3 : by + h + 11}
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fill="rgba(255,255,255,0.45)"
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
            x={bx + w + 1}
            y={by + h / 2}
            textAnchor="start"
            fontSize="6"
            fontWeight="800"
            fill={ringColor}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {ringMat}
          </text>
        )}

        {/* superficies */}
        {surfaceBox('V', bx + leftW, by, midW, topH)}
        {surfaceBox('M', bx, by + topH, leftW, midH)}
        {surfaceBox('O', bx + leftW, by + topH, midW, midH)}
        {surfaceBox('D', bx + leftW + midW, by + topH, rightW, midH)}
        {surfaceBox('L', bx + leftW, by + topH + midH, midW, botH)}
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

  return (
    <div style={styles.wrap}>
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
              <span style={{ ...styles.swatch, background: c.color, borderRadius: c.fill ? '2px' : '50%' }} />
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
            : `Selecciona ${cond?.label?.toLowerCase() || 'una condición'}${
                cond?.materials ? ` (${activeMat} — ${MATERIAL_LABELS[activeMat] || activeMat})` : ''
              } y toca las caras del diente${cond?.kind === 'tooth' ? ' o el diente completo (corona)' : ''}. Tocar de nuevo = alternar/quitar.`}
        </div>
      </div>

      {/* Odontograma */}
      <div style={styles.chartBox} className="panda-scrollbar">
        <svg viewBox="0 0 560 210" width="100%" style={{ maxWidth: '560px', display: 'block', margin: '0 auto' }}>
          {/* línea media */}
          <line x1="280" y1="8" x2="280" y2="200" stroke="rgba(232,212,176,0.25)" strokeDasharray="3 3" strokeWidth="1" />

          {/* Superior */}
          <g transform="translate(8, 8)">
            {UPPER_TEETH.map((n, i) => {
              const { w } = toothSize(n);
              const x = i * (w + 8 + 2);
              return (
                <g key={n} transform={`translate(${x}, 0)`}>
                  {renderTooth(n, true)}
                </g>
              );
            })}
          </g>

          {/* Inferior */}
          <g transform="translate(8, 108)">
            {LOWER_TEETH.map((n, i) => {
              const { w } = toothSize(n);
              const x = i * (w + 8 + 2);
              return (
                <g key={n} transform={`translate(${x}, 0)`}>
                  {renderTooth(n, false)}
                </g>
              );
            })}
          </g>

          {/* etiquetas de cuadrante */}
          <text x="90" y="205" fontSize="8" fill="rgba(255,255,255,0.30)" fontWeight="700">SUP · DER 18–11 | IZQ 21–28</text>
          <text x="340" y="205" fontSize="8" fill="rgba(255,255,255,0.30)" fontWeight="700">INF · IZQ 31–38 | DER 41–48</text>
        </svg>
      </div>

      {/* Leyenda (simbología clínica) */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>Simbología del odontograma</div>
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
              </svg>
              <div>
                <div style={styles.legendLabel}>{c.label}</div>
                {c.materials && (
                  <div style={styles.legendMats}>{c.materials.map(m => m).join(' · ')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={styles.legendNote}>
          Círculo en la cara = lesión/restauración en esa superficie (V, L, M, D, O). Anillo alrededor del diente = corona.
        </div>
      </div>

      {/* Resumen + acciones */}
      <div style={styles.toolbar}>
        <span style={styles.summary}>
          {marks.length === 0 ? 'Sin marcas en el odontograma' : `${marks.length} marca(s): ${summary}`}
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
      {/* acción extra: limpiar por cuadrante */}
      <div style={styles.quadRow}>
        <button type="button" onClick={() => emit(marks.filter(m => m.tooth < 20 || m.tooth > 29))} style={styles.quadBtn}>
          Limpiar superior (11–18, 21–28)
        </button>
        <button type="button" onClick={() => emit(marks.filter(m => m.tooth < 30 || m.tooth > 39))} style={styles.quadBtn}>
          Limpiar inferior (31–38, 41–48)
        </button>
        <button
          type="button"
          onClick={() => {
            // quitar solo coronas
            emit(marks.filter(m => m.type !== 'corona_def' && m.type !== 'corona_temp'));
          }}
          style={styles.quadBtn}
        >
          Quitar coronas
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '12px' },
  palette: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    padding: '12px', borderRadius: '14px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)'
  },
  paletteRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  condBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 10px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.85)',
    fontSize: '11.5px', fontWeight: '700', cursor: 'pointer'
  },
  swatch: { width: '10px', height: '10px', display: 'inline-block', border: '1.5px solid currentColor' },
  matLabel: { fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginRight: '4px' },
  matBtn: {
    padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
    fontSize: '12px', fontWeight: '800', cursor: 'pointer', letterSpacing: '0.3px'
  },
  hint: { fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 },
  chartBox: {
    padding: '10px 6px', borderRadius: '14px',
    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
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
  legendGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' },
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
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
  },
  quadRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  quadBtn: {
    padding: '6px 10px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.15)',
    background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
  }
};
