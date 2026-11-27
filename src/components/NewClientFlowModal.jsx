import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, CreditCard, Loader2, ClipboardPlus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useNotifs } from '../context/NotificationContext';
import { ModalShield } from '../context/ModalContext';
import PandaDatePicker from './PandaDatePicker';
import PandaSelect from './PandaSelect';
import AnimatedModal from './AnimatedModal';
import FieldLabel from './FieldLabel';
import { formatName } from '../utils/stringUtils';
import DateMaskInput from './DateMaskInput';
import { useScrollLock } from '../hooks/useScrollLock';

const ORIGIN_OPTIONS = [
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Referido por otra persona', value: 'Referido' },
  { label: 'Google / Google Maps', value: 'Google' },
  { label: 'TikTok', value: 'TikTok' },
  { label: 'Facebook', value: 'Facebook' },
  { label: 'Pasó por el local', value: 'Presencial' },
  { label: 'Otro', value: 'Otro' }
];

const SMILE_TYPE_OPTIONS = [
  { label: 'Alta', value: 'Alta' },
  { label: 'Media', value: 'Media' },
  { label: 'Baja', value: 'Baja' },
  { label: 'Invertida', value: 'Invertida' }
];

const GUM_TYPE_OPTIONS = [
  { label: 'Sana', value: 'Sana' },
  { label: 'Inflamada', value: 'Inflamada' },
  { label: 'Sangrante', value: 'Sangrante' },
  { label: 'Retracción', value: 'Retracción' }
];

const EMPTY_CLINICAL = {
  motivo_consulta: '',
  antecedentes: '',
  alergias: '',
  medicacion_actual: '',
  antecedentes_fam: '',
  habitos: '',
  exploracion: '',
  diagnostico: '',
  plan_tratamiento: '',
  notas: ''
};

export default function NewClientFlowModal({ isOpen, onClose, onSuccess }) {
  const { showToast } = useNotifs();
  const [step, setStep] = useState('personal'); // 'personal' | 'clinical'
  const [loading, setLoading] = useState(false);
  const [clinicalLoading, setClinicalLoading] = useState(false);

  const [personalData, setPersonalData] = useState({
    name: '',
    phone: '',
    id_card: '',
    birth_date: '',
    origin: '',
    smile_type: '',
    gum_type: ''
  });

  const [clinicalData, setClinicalData] = useState({ ...EMPTY_CLINICAL });

  const createdClientRef = { current: null };

  useScrollLock(isOpen);

  const goToClinical = useCallback(() => {
    setStep('clinical');
  }, []);

  const handlePersonalSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!personalData.name || !personalData.phone || !personalData.id_card || !personalData.origin) {
      showToast('Por favor completa nombre, teléfono, cédula y origen.', 'error');
      return;
    }

    try {
      setLoading(true);

      const existing = await dataService.checkClientExists(personalData.id_card);
      if (existing) {
        showToast(`La cédula ${personalData.id_card} ya está registrada a nombre de ${existing.name}.`, 'warning');
        setLoading(false);
        return;
      }

      const newClient = await dataService.addClient({
        name: personalData.name,
        phone: personalData.phone,
        id_card: personalData.id_card,
        birth_date: personalData.birth_date || null,
        origin: personalData.origin,
        smile_type: personalData.smile_type || null,
        gum_type: personalData.gum_type || null,
        active: true,
        status: 'Activo'
      });

      createdClientRef.current = newClient;
      showToast(`Cliente ${newClient.name} registrado. Completa su historial clínico.`);
      goToClinical();
    } catch (error) {
      if (error.code === '23505') {
        showToast('Esta cédula ya está registrada en el sistema.', 'error');
      } else {
        showToast('Error al crear el cliente.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClinicalSubmit = async () => {
    if (!createdClientRef.current) {
      showToast('No se pudo identificar el cliente creado.', 'error');
      return;
    }

    const hasContent = Object.values(clinicalData).some(v => v && String(v).trim().length > 0);
    if (!hasContent) {
      showToast('Completa al menos un campo del historial clínico antes de continuar.', 'error');
      return;
    }

    try {
      setClinicalLoading(true);
      await dataService.saveClinicalRecord(createdClientRef.current.id, {
        ...clinicalData,
        imagenes: [],
        odontograma: { marks: [] }
      }, { completed: false });

      showToast('Historial clínico guardado correctamente.');
      if (onSuccess) onSuccess(createdClientRef.current);
      onClose();
    } catch (error) {
      console.error('Error guardando historial clínico:', error);
      showToast('No se pudo guardar el historial clínico.', 'error');
    } finally {
      setClinicalLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { label: 'Datos Personales', done: step !== 'personal' },
      { label: 'Historial Clínico', done: step !== 'personal' }
    ];

    return (
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '24px',
        fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px'
      }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: s.done ? '#111111' : 'var(--text-secondary)'
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: s.done ? 'var(--gold-gradient)' : 'rgba(0,0,0,0.06)',
              border: s.done ? 'none' : '1px solid rgba(0,0,0,0.12)',
              color: s.done ? '#111111' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '900',
              flexShrink: 0
            }}>
              {i + 1}
            </div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <ModalShield active={true}>
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)', zIndex: 10000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '20px',
            paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
          }}>
            <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{
              maxWidth: '520px', width: '100%', borderRadius: '32px',
              border: '1.5px solid rgba(0, 0, 0, 0.08)',
              padding: '32px', position: 'relative',
              maxHeight: '92vh', overflowY: 'auto'
            }}>
              <button
                onClick={onClose}
                style={{
                  position: 'absolute', top: '24px', right: '24px',
                  background: 'rgba(0, 0, 0, 0.04)', border: 'none',
                  color: '#111111', width: '36px', height: '36px',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>

              <header style={{ marginBottom: '20px' }}>
                {renderStepIndicator()}
                <h2 style={{
                  fontSize: '22px', fontWeight: '900', color: '#111111',
                  marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                  {step === 'personal'
                    ? (<> <User size={24} color="var(--gold-primary)" /> <span>Nuevo <span className="text-gold">Cliente</span></span> </>)
                    : (<> <ClipboardPlus size={24} color="var(--gold-primary)" /> <span>Historial <span className="text-gold">Clínico</span></span> </>)}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {step === 'personal'
                    ? 'Completa los datos personales del paciente.'
                    : 'Completa la ficha clínica inicial del paciente.'}
                </p>
              </header>

              {/* PASO 1: DATOS PERSONALES */}
              {step === 'personal' && (
                <form onSubmit={handlePersonalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <FieldLabel required>Nombre y Apellido</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <User style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Ej. Juan Pérez"
                        value={personalData.name}
                        onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                        onBlur={() => setPersonalData({ ...personalData, name: formatName(personalData.name) })}
                        style={{ width: '100%', paddingLeft: '48px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <FieldLabel required>Teléfono</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <Phone style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
                      <input
                        type="tel"
                        placeholder="Ej. 04121234567"
                        value={personalData.phone}
                        onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                        style={{ width: '100%', paddingLeft: '48px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <FieldLabel required>Cédula de Identidad</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <CreditCard style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
                      <input
                        type="text"
                        placeholder="Ej. 25.123.456"
                        value={personalData.id_card}
                        onChange={(e) => setPersonalData({ ...personalData, id_card: e.target.value })}
                        style={{ width: '100%', paddingLeft: '48px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <FieldLabel>Fecha de Nacimiento</FieldLabel>
                    <DateMaskInput
                      className="form-input"
                      placeholder="DD/MM/AAAA"
                      value={personalData.birth_date}
                      onChange={(val) => setPersonalData({ ...personalData, birth_date: val })}
                      style={{ width: '100%', paddingLeft: '48px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Tipo de sonrisa</FieldLabel>
                      <PandaSelect
                        value={personalData.smile_type}
                        onChange={(val) => setPersonalData({ ...personalData, smile_type: val })}
                        placeholder="Seleccionar"
                        options={SMILE_TYPE_OPTIONS}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Encías</FieldLabel>
                      <PandaSelect
                        value={personalData.gum_type}
                        onChange={(val) => setPersonalData({ ...personalData, gum_type: val })}
                        placeholder="Seleccionar"
                        options={GUM_TYPE_OPTIONS}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <FieldLabel required>¿Cómo conoció Dientes Sanos?</FieldLabel>
                    <PandaSelect
                      value={personalData.origin}
                      onChange={(val) => setPersonalData({ ...personalData, origin: val })}
                      placeholder="Seleccionar origen"
                      options={ORIGIN_OPTIONS}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      style={{
                        flex: 1, height: '56px', borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: '#ffffff', color: '#111111',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-gold"
                      style={{ flex: 1.5, height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <>Siguiente <ArrowRight size={18} /></>}
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 2: HISTORIAL CLÍNICO */}
              {step === 'clinical' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setStep('personal')}
                      style={{
                        padding: '8px 14px', borderRadius: '10px',
                        border: 'none', background: 'rgba(0,0,0,0.06)',
                        color: '#111111', fontSize: '13px', fontWeight: '800',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                      Volver a datos personales
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Motivo de consulta</FieldLabel>
                      <textarea
                        value={clinicalData.motivo_consulta}
                        onChange={(e) => setClinicalData({ ...clinicalData, motivo_consulta: e.target.value })}
                        placeholder="Dolor molar inferior derecho…"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Antecedentes</FieldLabel>
                      <textarea
                        value={clinicalData.antecedentes}
                        onChange={(e) => setClinicalData({ ...clinicalData, antecedentes: e.target.value })}
                        placeholder="Cirugías, enfermedades previas…"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Alergias</FieldLabel>
                      <textarea
                        value={clinicalData.alergias}
                        onChange={(e) => setClinicalData({ ...clinicalData, alergias: e.target.value })}
                        placeholder="Anestesia, látex, medicamentos…"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Medicación actual</FieldLabel>
                      <textarea
                        value={clinicalData.medicacion_actual}
                        onChange={(e) => setClinicalData({ ...clinicalData, medicacion_actual: e.target.value })}
                        placeholder="Anticoagulantes, antibióticos…"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Antecedentes familiares</FieldLabel>
                      <textarea
                        value={clinicalData.antecedentes_fam}
                        onChange={(e) => setClinicalData({ ...clinicalData, antecedentes_fam: e.target.value })}
                        placeholder="Diabetes, hemofilia…"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Hábitos</FieldLabel>
                      <textarea
                        value={clinicalData.habitos}
                        onChange={(e) => setClinicalData({ ...clinicalData, habitos: e.target.value })}
                        placeholder="Bruxismo, tabaquismo, higiene…"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Exploración clínica</FieldLabel>
                      <textarea
                        value={clinicalData.exploracion}
                        onChange={(e) => setClinicalData({ ...clinicalData, exploracion: e.target.value })}
                        placeholder="Hallazgos generales, encías, radiografías…"
                        rows={3}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Diagnóstico</FieldLabel>
                      <textarea
                        value={clinicalData.diagnostico}
                        onChange={(e) => setClinicalData({ ...clinicalData, diagnostico: e.target.value })}
                        placeholder="Caries oclusal pieza 26…"
                        rows={3}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Plan de tratamiento</FieldLabel>
                      <textarea
                        value={clinicalData.plan_tratamiento}
                        onChange={(e) => setClinicalData({ ...clinicalData, plan_tratamiento: e.target.value })}
                        placeholder="Obturación + control en 15 días…"
                        rows={3}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FieldLabel>Notas adicionales</FieldLabel>
                      <textarea
                        value={clinicalData.notas}
                        onChange={(e) => setClinicalData({ ...clinicalData, notas: e.target.value })}
                        placeholder="Indicaciones post-operatorias…"
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d4d4d4', background: '#ffffff', color: '#111111', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setStep('personal')}
                      disabled={clinicalLoading}
                      style={{
                        flex: 1, height: '56px', borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: '#ffffff', color: '#111111',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                      }}
                    >
                      Volver atrás
                    </button>
                    <button
                      type="button"
                      onClick={handleClinicalSubmit}
                      disabled={clinicalLoading}
                      className="btn-gold"
                      style={{ flex: 1.5, height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                      {clinicalLoading ? <Loader2 className="animate-spin" size={20} /> : <>Guardar y finalizar <CheckCircle2 size={18} /></>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalShield>
      )}
    </AnimatedModal>,
    document.body
  );
}
