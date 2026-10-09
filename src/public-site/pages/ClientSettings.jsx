import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Phone, Shield, Edit2, Check, X, ArrowLeft } from 'lucide-react';
import { publicService } from '../services/publicService';

export default function ClientSettings() {
  const [client, setClient] = useState(() => JSON.parse(localStorage.getItem('panda_public_client') || 'null'));
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const clientData = JSON.parse(localStorage.getItem('panda_public_client') || 'null');
    if (!clientData) { navigate('/login'); return; }
    setClient(clientData);
    setFormData({
      name: clientData.name || '',
      phone: clientData.phone || '',
      id_card: clientData.id_card || '',
    });
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await publicService.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('panda_public_client');
    localStorage.removeItem('panda_public_session');
    localStorage.removeItem('bookingState');
    localStorage.removeItem('panda_draft_booking');
    navigate('/');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedClient = await publicService.updateClientProfile(client.id, formData);
      setClient(updatedClient);
      localStorage.setItem('panda_public_client', JSON.stringify(updatedClient));
      setIsEditing(false);
      // Trigger a re-render of ProfileHeader by reloading if needed, but react might handle it if they share state (they don't, but a reload ensures everything is in sync)
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Hubo un error al guardar tu perfil.');
    } finally {
      setSaving(false);
    }
  };



  const initials = client?.name?.trim()
    ? client.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'AR';

  return (
    <div className="w-full max-w-5xl 2xl:max-w-[1400px] mx-auto pt-6 pb-24 flex flex-col gap-6 min-h-screen px-4 md:px-8 lg:px-10 animate-fade-in-up">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-2 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="tab-intro-container" style={{ marginBottom: 0 }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/perfil')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#d9c08f]/15 text-[#64748b] hover:text-[#111111] hover:border-[#d9c08f]/30 transition-all" aria-label="Volver">
              <ArrowLeft size={16} />
            </button>
            <div className="tab-intro-eyebrow">
              <User size={12} color="#000" />
              <span>Ajustes de Cuenta</span>
            </div>
          </div>
          <h1 className="tab-intro-title">Mi Perfil</h1>
          <p className="tab-intro-subtitle" style={{ maxWidth: '320px' }}>Actualiza tus datos personales y gestiona tus preferencias para recibir una atención personalizada.</p>
        </div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0f172a] border border-[#d9c08f]/15 hover:border-[#111111] hover:text-[#111111] transition-all text-[11px] font-black uppercase tracking-wider shadow-[0_4px_10px_rgba(0,0,0,0.10)]">
            <Edit2 size={14} className="text-[#111111]" /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => { setIsEditing(false); setFormData({ name: client.name||'', phone: client.phone||'', id_card: client.id_card||'' }); }} className="text-[#64748b] hover:text-[#111111] p-2 transition-colors">
              <X size={18} />
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8d4b0] text-[#111111] hover:bg-[#d9c08f] transition-all text-[10px] font-black uppercase tracking-wider disabled:opacity-50 shadow-[0_0_15px_rgba(17,17,17,0.25)]">
              <Check size={14} /> {saving ? '...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {/* HERO CARD - CONTACT POSTER STYLE */}
      <div className="relative w-full rounded-[2.5rem] bg-white border border-[#d9c08f]/15 overflow-hidden shadow-2xl flex flex-col items-center justify-center p-10 sm:p-14 group transition-all duration-500 hover:border-[#d9c08f]/30 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        {/* Background ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-gradient-to-b from-[#111111]/15 via-transparent to-transparent blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full mb-6 border-[4px] border-white shadow-[0_0_0_2px_rgba(17,17,17,0.3)] bg-[#111111] flex items-center justify-center text-white overflow-hidden group-hover:scale-105 transition-transform duration-500">
          {client?.image_url ? (
            <img src={client.image_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl sm:text-5xl font-black">{initials}</span>
          )}
        </div>
        
        <div className="relative z-10 text-center w-full max-w-md">
          {isEditing ? (
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-white border border-[#d9c08f]/15 rounded-2xl px-4 py-4 text-[#0f172a] text-center text-xl sm:text-2xl font-black focus:border-[#111111] focus:bg-white outline-none transition-all shadow-inner"
              style={{ color: '#0f172a' }}
              placeholder="Tu nombre completo"
            />
          ) : (
            <h3 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight mb-2">{client.name}</h3>
          )}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#d9c08f]/15 mt-3 text-[#64748b] text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
             <User size={12} /> {client.email}
          </div>
        </div>
      </div>

      {/* INFO BENTO BOX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Phone */}
        <div className="p-6 sm:p-8 rounded-[2rem] bg-white border border-[#d9c08f]/15 hover:border-[#d9c08f]/30 transition-all duration-300 flex flex-col justify-between min-h-[140px] group animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-3 text-[#111111] mb-4">
            <div className="w-10 h-10 rounded-full bg-[#111111]/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#111111] group-hover:text-white transition-all duration-300">
              <Phone size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Contacto</span>
          </div>
          <div>
            {isEditing ? (
              <input 
                type="text" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-white border border-[#d9c08f]/15 rounded-xl px-4 py-3 text-[#0f172a] text-lg font-bold focus:border-[#111111] outline-none transition-all"
                style={{ color: '#0f172a' }}
                placeholder="Número de teléfono"
              />
            ) : (
              <p className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-wide">{client.phone || <span className="text-[#94a3b8] italic text-base">No registrado</span>}</p>
            )}
          </div>
        </div>

        {/* Cédula */}
        <div className="p-6 sm:p-8 rounded-[2rem] bg-white border border-[#d9c08f]/15 hover:border-[#d9c08f]/30 transition-all duration-300 flex flex-col justify-between min-h-[140px] animate-fade-in-up" style={{ animationDelay: '220ms' }}>
          <div className="flex items-center gap-3 text-[#64748b] mb-4">
            <div className="w-10 h-10 rounded-full bg-[#f7f7f5] flex items-center justify-center">
              <Shield size={16} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cédula de Identidad</span>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xl sm:text-2xl font-bold text-[#64748b] tracking-wide">{client.id_card || <span className="text-[#94a3b8] italic text-base">No registrado</span>}</p>
              {isEditing && (
                <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md font-black uppercase tracking-wider animate-pulse">
                  Solo Lectura
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LOGOUT BUTTON (Visible mainly for mobile users where sidebar isn't present) */}
      <div className="flex justify-center mt-8 pb-12">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all font-bold uppercase tracking-widest text-[10px]"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>

    </div>
  );
}
