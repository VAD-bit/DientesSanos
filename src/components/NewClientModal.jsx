import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, CreditCard, Tag, Loader2 } from 'lucide-react';
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

const NewClientModal = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useNotifs();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    id_card: '',
    birth_date: '',
    origin: ''
  });

  useScrollLock(isOpen);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.id_card || !formData.origin) {
      showToast('Por favor completa todos los campos.', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Check for duplicate id_card
      const existing = await dataService.checkClientExists(formData.id_card);
      if (existing) {
        showToast(`La cédula ${formData.id_card} ya está registrada a nombre de ${existing.name}.`, 'warning');
        setLoading(false);
        return;
      }

      const newClient = await dataService.addClient(formData);
      
      showToast(`Cliente ${newClient.name} registrado con éxito`);
      if (onSuccess) onSuccess(newClient);
      onClose();
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation code
        showToast('Esta cédula ya está registrada en el sistema.', 'error');
      } else {
        showToast('Error de conexión con la base de datos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatedModal isOpen={isOpen}>
      {(overlayClass, cardClass) => (
        <ModalShield active={true}>
          <div className={overlayClass.replace('global-modal-overlay', '')} style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(10px)', 
            zIndex: 10000, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '20px',
            paddingTop: 'max(20px, env(safe-area-inset-top, 20px))'
          }}>
            <div className={`glass-card ${cardClass.replace('global-modal-card', '')}`} style={{ 
              maxWidth: '450px', 
              width: '100%', 
              borderRadius: '32px', 
              border: '1.5px solid rgba(255, 255, 255,0.3)',
              padding: '32px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <button 
                onClick={onClose} 
                style={{ 
                  position: 'absolute', 
                  top: '24px', 
                  right: '24px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: 'none', 
                  color: 'white', 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer' 
                }}
              >
                <X size={18} />
              </button>

              <header style={{ marginBottom: '32px' }}>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: '900', 
                  color: 'white', 
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <User size={24} color="var(--gold-primary)" />
                  <span>Nuevo <span className="text-gold">Cliente</span></span>
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Completa los datos para registrarlo en el sistema.
                </p>
              </header>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FieldLabel required>Nombre y Apellido</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '16px', top: '14px' }} size={18} color="var(--gold-primary)" />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Ej. Juan Pérez" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      onBlur={() => setFormData({...formData, name: formatName(formData.name)})}
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
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
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
                      value={formData.id_card}
                      onChange={(e) => setFormData({...formData, id_card: e.target.value})}
                      style={{ width: '100%', paddingLeft: '48px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FieldLabel>Fecha de Nacimiento</FieldLabel>
                  <DateMaskInput
                    className="form-input"
                    placeholder="DD/MM/AAAA"
                    value={formData.birth_date}
                    onChange={(val) => setFormData({...formData, birth_date: val})}
                    style={{ width: '100%', paddingLeft: '48px' }}
                  />
                </div>

                <PandaSelect
                  label="¿Cómo conoció Dientes Sanos?"
                  value={formData.origin}
                  onChange={(val) => setFormData({ ...formData, origin: val })}
                  placeholder="Seleccionar origen"
                  options={[
                    { label: 'Instagram', value: 'Instagram' },
                    { label: 'Referido por otra persona', value: 'Referido' },
                    { label: 'Google / Google Maps', value: 'Google' },
                    { label: 'TikTok', value: 'TikTok' },
                    { label: 'Facebook', value: 'Facebook' },
                    { label: 'Pasó por el local', value: 'Presencial' },
                    { label: 'Otro', value: 'Otro' }
                  ]}
                />

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn-gold" 
                    style={{ flex: 1.5, height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'REGISTRAR CLIENTE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalShield>
      )}
    </AnimatedModal>,
    document.body
  );
};

export default NewClientModal;
