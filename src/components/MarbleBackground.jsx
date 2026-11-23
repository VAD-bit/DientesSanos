import React from 'react';

// Fondo de mÃ¡rmol blanco con vetas grises, estilo la imagen de referencia.
// Generado en SVG sin depender de imÃ¡genes externas.
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
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Ruido orgÃ¡nico que genera las vetas del mÃ¡rmol */}
          <filter id="marbleVeins" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008"
              numOctaves="5"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0"
              result="veinMask"
            />
            <feComponentTransfer in="veinMask" result="veins">
              <feFuncR type="table" tableValues="0 0 0 0.05 0.15 0.3 0.5 0.7 0.9 1" />
              <feFuncG type="table" tableValues="0 0 0 0.05 0.15 0.3 0.5 0.7 0.9 1" />
              <feFuncB type="table" tableValues="0 0 0 0.08 0.2 0.4 0.6 0.8 1 1.1" />
              <feFuncA type="table" tableValues="0 0 0 0 0.02 0.05 0.09 0.14 0.2 1" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* Base blanca / gris muy clara (mÃ¡rmol blanco) */}
        <rect width="100%" height="100%" fill="#fafafa" />

        {/* Vetras principales de mÃ¡rmol gris suave */}
        <rect
          width="100%"
          height="100%"
          fill="#ffffff"
          filter="url(#marbleVeins)"
          opacity="0.5"
        />

        {/* Vetas suaves adicionales para profundidad orgÃ¡nica */}
        <path
          d="M 60 240 Q 400 140 740 260 T 60 660"
          fill="none"
          stroke="rgba(120, 130, 145, 0.12)"
          strokeWidth="3"
        />
        <path
          d="M 260 780 Q 560 660 920 480"
          fill="none"
          stroke="rgba(120, 130, 145, 0.10)"
          strokeWidth="2.5"
        />
        <path
          d="M 140 140 Q 360 360 180 820 Q 520 740 860 540"
          fill="none"
          stroke="rgba(120, 130, 145, 0.08)"
          strokeWidth="2"
        />
        <path
          d="M 920 220 Q 700 420 460 220 T 80 520"
          fill="none"
          stroke="rgba(120, 130, 145, 0.07)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

