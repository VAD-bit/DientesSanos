import React from 'react';

// Icono de diente con el mismo contrato visual que los iconos de lucide-react
// (svg 24Ã—24, trazo `currentColor`, extremos redondos) para que se integre en
// cualquier sitio donde antes se usaba el icono de tijera.
// Props: size, color, strokeWidth, className, style + props nativas del svg.
const ToothIcon = ({ size = 24, color = 'currentColor', strokeWidth = 2, className, style, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
    {...rest}
  >
    <path d="M12 4.8c-1.6-1.5-4-2-5.9-.9C4.2 5.2 3.7 8 4.4 10.8c.4 1.7.8 2.8 1.1 4.4.3 1.7.6 3.4 1.9 3.4 1.3 0 1.8-1.7 2.2-3.4.3-1.3.6-2.3 2.4-2.3s2.1 1 2.4 2.3c.4 1.7.9 3.4 2.2 3.4 1.3 0 1.6-1.7 1.9-3.4.3-1.6.7-2.7 1.1-4.4.7-2.8.2-5.6-1.8-6.9-1.9-1.1-4.3-.6-5.9.9z" />
  </svg>
);

export default ToothIcon;

