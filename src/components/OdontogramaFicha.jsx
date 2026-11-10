import React, { useMemo } from 'react';

// FDI (ISO 3950): disposición como ficha impresa de referencia
// Superior: 18..11 | 21..28
// Temporal superior: 55..51 | 61..65
// Temporal inferior: 85..81 | 71..75
// Inferior: 48..41 | 31..38
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const TEMP_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const TEMP_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const TOOTH_D = 30;      // diámetro del círculo del diente
const GAP = 10;          // gap entre dientes
const ARCH_GAP = 28;     // gap entre cuadrantes (medio)
const ROW_GAP = 44;      // gap entre filas

// offset X por fila (centrado en su bloque)
function rowX(n, i, archGap) {
  return i * (TOOTH_D + GAP) + (i >= Math.ceil(n / 2) ? archGap : 0);
}

export default function OdontogramaFicha({ value, editable = true }) {
  const marks = useMemo(() => (Array.isArray(value?.marks) ? value.marks : []), [value]);

  const marksForTooth = (num) => marks.filter(m => m.tooth === num);

  const toothMark = (num) => {
    const ms = marksForTooth(num);
    if (ms.length === 0) return null;
    // tomar la primera marca; usamos color rojo por defecto (caries/lesión)
    return ms[0];
  };

  const renderTooth = (num) => {
    const mark = toothMark(num);
    const hasMark = mark !== null;
    const color = mark ? '#b91c1c' : '#374151';

    return (
      <g key={num} style={{ cursor: editable ? 'pointer' : 'default' }}>
        {/* círculo exterior (diente) */}
        <circle
          cx="0"
          cy="0"
          r={TOOTH_D / 2}
          fill="#ffffff"
          stroke={color}
          strokeWidth={hasMark ? 2.2 : 1.4}
          style={{ cursor: editable ? 'pointer' : 'default' }}
        />
        {/* cruz interior */}
        <g stroke={color} strokeWidth={hasMark ? 2.2 : 1.2} strokeLinecap="round">
          <line x1={-TOOTH_D * 0.28} y1={-TOOTH_D * 0.28} x2={TOOTH_D * 0.28} y2={TOOTH_D * 0.28} />
          <line x1={TOOTH_D * 0.28} y1={-TOOTH_D * 0.28} x2={-TOOTH_D * 0.28} y2={TOOTH_D * 0.28} />
        </g>
        {/* número FDI debajo del diente */}
        <text
          x="0"
          y={TOOTH_D / 2 + 14}
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          fill="#111827"
          style={{ userSelect: 'none' }}
        >
          {num}
        </text>
      </g>
    );
  };

  const renderRow = (teeth, y) => (
    <g key={y} transform={`translate(0, ${y})`}>
      {teeth.map((n, i) => {
        const x = rowX(teeth.length, i, ARCH_GAP);
        return (
          <g key={n} transform={`translate(${x}, 0)`}>
            {renderTooth(n)}
          </g>
        );
      })}
    </g>
  );

  const totalW =
    Math.max(UPPER_TEETH.length, TEMP_UPPER.length, LOWER_TEETH.length) * (TOOTH_D + GAP) +
    ARCH_GAP +
    40;

  return (
    <svg
      viewBox={`0 0 ${totalW} 330`}
      width="100%"
      style={{ display: 'block', margin: '0 auto', background: '#ffffff' }}
    >
      {/* Superior */}
      {renderRow(UPPER_TEETH, 50)}

      {/* Temporal superior */}
      {renderRow(TEMP_UPPER, 50 + ROW_GAP)}

      {/* Temporal inferior */}
      {renderRow(TEMP_LOWER, 50 + ROW_GAP * 2)}

      {/* Inferior */}
      {renderRow(LOWER_TEETH, 50 + ROW_GAP * 3)}

      {/* etiquetas de cuadrante */}
      <text
        x={totalW / 4}
        y={300}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#6b7280"
      >
        SUP · DER 18–11 | IZQ 21–28
      </text>
      <text
        x={(totalW / 4) * 3}
        y={300}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="#6b7280"
      >
        INF · DER 48–41 | IZQ 31–38
      </text>
    </svg>
  );
}
