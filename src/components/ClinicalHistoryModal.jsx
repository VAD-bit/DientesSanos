import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ClipboardPlus, Camera, Save, Loader2, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { dataService } from '../services/dataService';

const EMPTY_FORM = {
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

async function compressImage(file, maxDim = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Field({ label, value, onChange, placeholder, rows = 3, multiline = true }) {
  if (!multiline) {
    return (
      <label style={{ display: 'block' }}>
        <span style={styles.label}>{label}</span>
        <input
          style={styles.input}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </label>
    );
  }
  return (
    <label style={{ display: 'block' }}>
      <span style={styles.label}>{label}</span>
      <textarea
        style={{ ...styles.input, minHeight: `${rows * 22}px`, resize: 'vertical' }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

export default function ClinicalHistoryModal({ isOpen, client, onClose, mandatory = false, onSaved }) {
  const [tab, setTab] = useState('manual');
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const clientId = client?.id;

  useEffect(() => {
    if (!isOpen || !clientId) return;
    let alive = true;
    dataService.getClinicalRecord(clientId)
      .then(rec => {
        if (!alive) return;
        setTab('manual');
        setError('');
        if (rec) {
          setForm({
            motivo_consulta: rec.motivo_consulta || '',
            antecedentes: rec.antecedentes || '',
            alergias: rec.alergias || '',
            medicacion_actual: rec.medicacion_actual || '',
            antecedentes_fam: rec.antecedentes_fam || '',
            habitos: rec.habitos || '',
            exploracion: rec.exploracion || '',
            diagnostico: rec.diagnostico || '',
            plan_tratamiento: rec.plan_tratamiento || '',
            notas: rec.notas || ''
          });
          setImagenes(Array.isArray(rec.imagenes) ? rec.imagenes : []);
        } else {
          setForm(EMPTY_FORM);
          setImagenes([]);
        }
      })
      .catch(e => {
        if (!alive) return;
        console.error('Error cargando historial clínico', e);
        setTab('manual');
        setError('No se pudo cargar el historial. Verifica que la tabla clinical_records exista en Supabase.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isOpen, clientId]);

  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    try {
      const compressed = await Promise.all(files.map(f => compressImage(f)));
      setImagenes(prev => [...prev, ...compressed].slice(0, 8));
      setTab('fotos');
    } catch (err) {
      console.error(err);
      setError('No se pudieron procesar las imágenes.');
    }
  };

  const removeImage = (idx) => {
    setImagenes(prev => prev.filter((_, i) => i !== idx));
  };

  const canSave = () => {
    if (mandatory) {
      const hasContent = form.motivo_consulta.trim() || form.diagnostico.trim() || form.exploracion.trim() || imagenes.length > 0;
      return hasContent;
    }
    return true;
  };

  const handleSave = async () => {
    if (!clientId) return;
    if (!canSave()) {
      setError('Completa al menos el motivo de consulta, el diagnóstico o adjunta una foto del historial.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await dataService.saveClinicalRecord(clientId, { ...form, imagenes }, { completed: true });
      if (typeof onSaved === 'function') onSaved({ clientId, form, imagenes });
      if (!mandatory && typeof onClose === 'function') onClose();
    } catch (e) {
      console.error('Error guardando historial clínico', e);
      setError('No se pudo guardar. Revisa la conexión o el esquema de la tabla clinical_records.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div style={styles.overlay} onClick={mandatory ? undefined : onClose}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.iconBox}><ClipboardPlus size={20} color="#111" /></div>
            <div>
              <h2 style={styles.title}>Historial Clínico</h2>
              <span style={styles.subtitle}>{client.name}</span>
            </div>
          </div>
          {!mandatory && (
            <button onClick={onClose} style={styles.closeBtn} aria-label="Cerrar"><X size={18} /></button>
          )}
        </div>

        {mandatory && (
          <div style={styles.mandatoryBanner}>
            <AlertTriangle size={15} color="#111" />
            <span>Obligatorio: completa el historial para concluir el servicio.</span>
          </div>
        )}

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'manual' ? styles.tabActive : {}) }}
            onClick={() => setTab('manual')}
            type="button"
          >
            <FileText size={14} /> Manual
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'fotos' ? styles.tabActive : {}) }}
            onClick={() => setTab('fotos')}
            type="button"
          >
            <Camera size={14} /> Foto / Escaneo
          </button>
        </div>

        <div style={styles.body} className="panda-scrollbar">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              Cargando historial…
            </div>
          ) : tab === 'manual' ? (
            <div style={{ display: 'grid', gap: '14px' }}>
              <Field label="Motivo de consulta *" value={form.motivo_consulta} onChange={v => set('motivo_consulta', v)} placeholder="Dolor molar inferior derecho…" rows={2} />
              <Field label="Antecedentes" value={form.antecedentes} onChange={v => set('antecedentes', v)} placeholder="Cirugías, enfermedades previas…" rows={2} />
              <Field label="Alergias" value={form.alergias} onChange={v => set('alergias', v)} placeholder="Anestesia, látex, medicamentos…" rows={2} />
              <Field label="Medicación actual" value={form.medicacion_actual} onChange={v => set('medicacion_actual', v)} placeholder="Anticoagulantes, antibióticos…" rows={2} />
              <Field label="Antecedentes familiares" value={form.antecedentes_fam} onChange={v => set('antecedentes_fam', v)} placeholder="Diabetes, hemofilia…" rows={2} />
              <Field label="Hábitos" value={form.habitos} onChange={v => set('habitos', v)} placeholder="Bruxismo, tabaquismo, higiene…" rows={2} />
              <Field label="Exploración clínica" value={form.exploracion} onChange={v => set('exploracion', v)} placeholder="Hallazgos, piezas afectadas,radiografías…" rows={3} />
              <Field label="Diagnóstico *" value={form.diagnostico} onChange={v => set('diagnostico', v)} placeholder="Caries oclusal pieza 26…" rows={3} />
              <Field label="Plan de tratamiento" value={form.plan_tratamiento} onChange={v => set('plan_tratamiento', v)} placeholder="Obturación + control en 15 días…" rows={3} />
              <Field label="Notas adicionales" value={form.notas} onChange={v => set('notas', v)} placeholder="Indicaciones post-operatorias…" rows={2} />
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px', lineHeight: 1.5 }}>
                Adjunta fotos del historial físico o documentos escaneados del paciente. Se comprimen automáticamente.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFiles}
                style={{ display: 'none' }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} style={styles.uploadBtn}>
                <Camera size={17} /> Agregar fotos del historial
              </button>
              {imagenes.length > 0 && (
                <div style={styles.grid}>
                  {imagenes.map((src, idx) => (
                    <div key={idx} style={styles.thumbWrap}>
                      <img src={src} alt={`Historial ${idx + 1}`} style={styles.thumb} />
                      <button type="button" onClick={() => removeImage(idx)} style={styles.thumbDel} aria-label="Quitar imagen">
                        <Trash2 size={13} color="#fff" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
        </div>

        <div style={styles.footer}>
          <button type="button" onClick={mandatory ? undefined : onClose} style={styles.cancelBtn} disabled={saving}>
            {mandatory ? 'Cancelar no disponible' : 'Cerrar'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !canSave()}
            style={{ ...styles.saveBtn, opacity: (saving || loading || !canSave()) ? 0.55 : 1 }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar historial
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 25000,
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
  },
  card: {
    width: '100%', maxWidth: '560px', maxHeight: '92vh',
    background: '#1e1e22', borderRadius: '22px',
    border: '1px solid rgba(255,255,255,0.10)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '18px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  iconBox: {
    width: '40px', height: '40px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #e8d4b0, #d9c08f)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  title: { fontSize: '18px', fontWeight: '800', color: '#f5f5f5', margin: 0 },
  subtitle: { fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  closeBtn: {
    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  mandatoryBanner: {
    margin: '12px 20px 0', padding: '10px 14px', borderRadius: '12px',
    background: 'rgba(232, 212, 176, 0.15)', border: '1px solid rgba(232,212,176,0.4)',
    color: '#e8d4b0', fontSize: '12.5px', fontWeight: '700',
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  tabs: { display: 'flex', gap: '6px', padding: '12px 20px 0' },
  tab: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.65)',
    fontSize: '12.5px', fontWeight: '700', cursor: 'pointer'
  },
  tabActive: {
    background: 'rgba(232,212,176,0.14)', borderColor: 'rgba(232,212,176,0.45)', color: '#e8d4b0'
  },
  body: { padding: '16px 20px', overflowY: 'auto', flex: 1 },
  label: {
    display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.4px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px'
  },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(0,0,0,0.30)',
    color: '#f5f5f5', fontSize: '13.5px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  },
  uploadBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '14px', borderRadius: '14px', border: '1.5px dashed rgba(232,212,176,0.5)',
    background: 'rgba(232,212,176,0.07)', color: '#e8d4b0', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer'
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginTop: '14px' },
  thumbWrap: { position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', aspectRatio: '1' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbDel: {
    position: 'absolute', top: '6px', right: '6px', width: '26px', height: '26px',
    borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  },
  error: {
    marginTop: '12px', padding: '10px 12px', borderRadius: '10px',
    background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.35)',
    color: '#ff8a80', fontSize: '12.5px', fontWeight: '600'
  },
  footer: {
    display: 'flex', gap: '10px', padding: '14px 20px 18px',
    borderTop: '1px solid rgba(255,255,255,0.06)'
  },
  cancelBtn: {
    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.10)',
    background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
  },
  saveBtn: {
    flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px', borderRadius: '12px', border: 'none',
    background: 'linear-gradient(135deg, #e8d4b0, #d9c08f)', color: '#111',
    fontSize: '13.5px', fontWeight: '800', cursor: 'pointer'
  }
};
