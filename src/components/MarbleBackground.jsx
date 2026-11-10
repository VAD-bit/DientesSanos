import React from 'react';

// Fondo de mármol blanco con vetas grises, generado con SVG (sin depender de imágenes externas).
// Se sitúa detrás de la interfaz del panel de administración.
export default function MarbleBackground() {
  return (
    <div
      className="admin-marble-bg"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox="0 0 900 900"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Ruido base que genera las vetas del mármol */}
          <filter id="marbleVeins" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="4"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0"
              result="veinMask"
            />
            <feComponentTransfer in="veinMask" result="veins">
              <feFuncR type="table" tableValues="0 0 0 0.1 0.25 0.45 0.65 0.85 1" />
              <feFuncG type="table" tableValues="0 0 0 0.1 0.25 0.45 0.65 0.85 1" />
              <feFuncB type="table" tableValues="0 0 0 0.15 0.3 0.5 0.7 0.9 1.05" />
              <feFuncA type="table" tableValues="0 0 0 0 0.03 0.08 0.14 0.22 1" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* Base blanca / gris muy clara */}
        <rect width="100%" height="100%" fill="#f5f7fa" />

        {/* Vetras de mármol gris sobre la base */}
        <rect
          width="100%"
          height="100%"
          fill="#ffffff"
          filter="url(#marbleVeins)"
          opacity="0.55"
        />

        {/* Vetas suaves adicionales para dar profundidad */}
        <path
          d="M 80 220 Q 450 120 820 260 T 80 620"
          fill="none"
          stroke="rgba(148, 163, 184, 0.14)"
          strokeWidth="4"
        />
        <path
          d="M 220 720 Q 520 620 860 440"
          fill="none"
          stroke="rgba(148, 163, 184, 0.10)"
          strokeWidth="3"
        />
        <path
          d="M 120 120 Q 300 300 140 780 Q 450 700 780 500"
          fill="none"
          stroke="rgba(148, 163, 184, 0.08)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
