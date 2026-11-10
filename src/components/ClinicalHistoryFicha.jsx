import React from 'react';
import OdontogramaFicha from './OdontogramaFicha';

const ARENA = '#E8D4B0';
const ARENA_OSCURO = '#D9C08F';
const TEXTO = '#111827';
const MUTE = '#6b7280';
const LINEA = '#9ca3af';

export default function ClinicalHistoryFicha({ client, record, odontograma, onPrint, onClose }) {
  const form = record || {};
  const marks = Array.isArray(odontograma?.marks) ? odontograma.marks : (Array.isArray(form?.odontograma?.marks) ? form.odontograma.marks : []);
  const nombre = client?.name || '';
  const cedula = client?.cedula || client?.id || '';
  const apellido = client?.apellido || '';
  const telefono = client?.telefono || '';
  const patologia = form?.antecedentes || form?.patologia || '';
  const edad = form?.edad || '';
  const fechaIngreso = form?.fecha_ingreso || form?.created_at || '';
  const dr = form?.doctor || form?.dr || '';

  const tratamientos = Array.isArray(form?.tratamientos) ? form.tratamientos : [];

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        color: TEXTO,
        background: '#ffffff',
        padding: '24px',
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '26px',
          borderBottom: `2px solid ${TEXTO}`,
          paddingBottom: '14px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            background: TEXTO,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="36"
            height="36"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M12 2s3 3 3 9c0 4-3 9-3 9s-3-5-3-9c0-6 3-9 3-9Z" />
            <path d="M12 13c0-2 2-2 2-2s2 0 2 2c0 2-2 4-2 4s-2-2-2-4" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: MUTE,
              marginBottom: '2px',
            }}
          >
            Centro Clínico Integral
          </div>
          <div style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '-0.5px' }}>
            Dientes Sanos
          </div>
          <div
            style={{
              fontSize: '10.5px',
              fontStyle: 'italic',
              color: MUTE,
              marginTop: '2px',
            }}
          >
            Diseñamos tu mejor sonrisa
          </div>
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '800',
            textAlign: 'right',
            color: TEXTO,
          }}
        >
          📞 (0424) 367.95.76
        </div>
      </div>

      {/* Datos del paciente */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 30px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase', marginBottom: '4px' }}>Nombre:</div>
            <div style={{ borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', height: '22px' }}>{nombre}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase', marginBottom: '4px' }}>Cédula:</div>
            <div style={{ borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', height: '22px' }}>{cedula}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase', marginBottom: '4px' }}>Apellido:</div>
            <div style={{ borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', height: '22px' }}>{apellido}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase', marginBottom: '4px' }}>Teléfono:</div>
            <div style={{ borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', height: '22px' }}>{telefono}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase', marginBottom: '4px' }}>Patología:</div>
            <div style={{ borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', height: '22px' }}>{patologia}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase', marginBottom: '4px' }}>Edad:</div>
            <div style={{ borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', minWidth: '40px', height: '22px' }}>{edad}</div>
            <div style={{ fontSize: '11px', color: MUTE }}>años</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase', marginBottom: '4px' }}>Fecha de Ingreso:</div>
            <div style={{ borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', height: '22px' }}>{fechaIngreso}</div>
          </div>
        </div>
      </div>

      {/* Odontograma */}
      <div style={{ marginBottom: '22px' }}>
        <OdontogramaFicha value={{ marks }} />
      </div>

      <div
        style={{
          borderBottom: `1px solid ${LINEA}`,
          paddingBottom: '6px',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '800', color: MUTE, textTransform: 'uppercase' }}>Dr.:</div>
        <div style={{ flex: 1, borderBottom: `1px solid ${LINEA}`, paddingBottom: '2px', height: '20px' }}>{dr}</div>
      </div>

      {/* Tabla de tratamientos */}
      <div style={{ marginBottom: '18px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 6px',
                  borderBottom: `2px solid ${TEXTO}`,
                  background: '#4a2c2a',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                FECHA
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 6px',
                  borderBottom: `2px solid ${TEXTO}`,
                  background: '#4a2c2a',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                TRATAMIENTO
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 6px',
                  borderBottom: `2px solid ${TEXTO}`,
                  background: '#4a2c2a',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                COSTO
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i}>
                <td
                  style={{
                    padding: '9px 6px',
                    borderBottom: `1px solid ${LINEA}`,
                    height: '30px',
                    verticalAlign: 'top',
                  }}
                >
                  {tratamientos[i]?.fecha || ''}
                </td>
                <td
                  style={{
                    padding: '9px 6px',
                    borderBottom: `1px solid ${LINEA}`,
                    height: '30px',
                    verticalAlign: 'top',
                  }}
                >
                  {tratamientos[i]?.tratamiento || ''}
                </td>
                <td
                  style={{
                    padding: '9px 6px',
                    borderBottom: `1px solid ${LINEA}`,
                    height: '30px',
                    verticalAlign: 'top',
                  }}
                >
                  {tratamientos[i]?.costo || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Acciones de impresión */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button
          type="button"
          onClick={onPrint}
          style={{
            background: ARENA,
            color: '#111827',
            border: 'none',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '800',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Imprimir ficha
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            color: MUTE,
            border: `1px solid ${LINEA}`,
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '700',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
