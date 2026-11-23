import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Check, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { publicService } from '../services/publicService';
import logo from '../../assets/logo_full.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await publicService.resetPassword(email);
      setSent(true);
    } catch (e) {
      console.error('Reset error:', e);
      setError(e.message || 'Error al enviar el correo. Verifica tu email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: '#f4f5f3',
      backgroundImage: 'linear-gradient(135deg,#f7f4ee 0%,#efe6d5 50%,#e8d4b0 100%)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: `none`,
      }} />

      {/* Back to login */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'absolute', top: 'calc(max(env(safe-area-inset-top, 0px), 16px))', left: 20, zIndex: 2 }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(217, 192, 143,0.10)'; e.currentTarget.style.borderColor = 'rgba(217, 192, 143,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(217, 192, 143,0.06)'; e.currentTarget.style.borderColor = 'rgba(217, 192, 143,0.25)'; }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(217, 192, 143,0.06)', border: '1px solid rgba(217, 192, 143,0.25)',
            borderRadius: 999, padding: '8px 16px', fontSize: 12.5, fontWeight: 600,
            color: '#64748b', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={14} /> Volver al login
        </button>
      </motion.div>

      <div style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(max(env(safe-area-inset-top, 0px) + 20px, 60px)) clamp(16px, 5vw, 48px) 60px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 440 }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 18px',
              border: '1.5px solid rgba(17, 17, 17,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={22} style={{ color: 'var(--champagne)' }} />
            </div>
            <h1 className="section-title" style={{ fontSize: '1.8rem', marginBottom: 8 }}>
              ¿Olvidaste tu <span className="text-gold">Contraseña</span>?
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
              Ingresa tu email y te enviaremos las instrucciones
            </p>
          </div>

          <div className="glass-card" style={{
            padding: '28px 26px',
            borderRadius: 24,
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(17, 17, 17,0.15)',
            boxShadow: '0 32px 80px -20px rgba(0,0,0,0.10), 0 0 40px -15px rgba(17, 17, 17,0.08)',
          }}>
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '10px 0' }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={26} style={{ color: '#22c55e' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111111', marginBottom: 8 }}>
                  Correo <span style={{ color: '#22c55e' }}>Enviado</span>
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  Revisa tu bandeja de entrada en<br />
                  <strong style={{ color: 'var(--champagne)' }}>{email}</strong><br />
                  y sigue las instrucciones para restablecer tu contraseña.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--champagne)', fontWeight: 700, fontSize: 14,
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                >
                  <ArrowLeft size={16} /> Volver al Login
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, color: '#ef4444', fontSize: 13 }}
                  >
                    {error}
                  </motion.div>
                )}

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                    <Mail size={13} style={{ color: 'var(--champagne)' }} />
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="correo@ejemplo.com"
                    required
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(17, 17, 17,0.35)' }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-gold"
                  style={{
                    width: '100%', padding: '15px', fontSize: 15, fontWeight: 700,
                    borderRadius: 'var(--radius-pill)',
                    opacity: loading ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Enviando...' : <>Enviar Instrucciones <ArrowRight size={17} /></>}
                </motion.button>
              </form>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              maxWidth: 380, margin: '24px auto 0', textAlign: 'center',
            }}
          >
            <Shield size={15} style={{ color: 'var(--champagne)', flexShrink: 0 }} />
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Solo podrás restablecer la contraseña de cuentas creadas con email/contraseña.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
