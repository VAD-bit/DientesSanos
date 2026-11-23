import React from 'react';

/**
 * FieldLabel — Unified label for form fields with required/optional indicators.
 *
 * Usage:
 *   <FieldLabel required>Cliente</FieldLabel>
 *   <FieldLabel>Extras</FieldLabel>  // shows "Opcional" badge
 *   <FieldLabel required={false} hint="Mínimo 1 servicio">Servicios</FieldLabel>
 */
const FieldLabel = ({ children, required = false, hint, style = {}, ...props }) => {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', ...style }} {...props}>
      <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {children}
      </span>

      {required ? (
        <span className="field-required-dot" />
      ) : (
        <span className="field-optional-badge">Opcional</span>
      )}

      {hint && (
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: '500', marginLeft: '2px' }}>
          {hint}
        </span>
      )}
    </label>
  );
};

export default FieldLabel;
