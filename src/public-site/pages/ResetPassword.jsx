import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import { publicService } from '../services/publicService';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Check if we have a session (user clicked the reset link)
    const checkSession = async () => {
      const session = await publicService.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        navigate('/forgot-password');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await publicService.updatePassword(password);
      setSuccess(true);
    } catch (e) {
      console.error('Reset error:', e);
      setError(e.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(max(env(safe-area-inset-top, 0px) + 20px, 60px)) 16px 60px' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Check size={32} style={{ color: '#22c55e' }} />
          </div>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            Contraseña <span className="text-gold">Actualizada</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12, marginBottom: 24 }}>
            Tu contraseña ha sido cambiada exitosamente
          </p>
          <button onClick={() => navigate('/login')} className="btn-gold" style={{ padding: '12px 32px', borderRadius: 'var(--radius-pill)' }}>
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="animate-pulse" style={{ height: '14px', borderRadius: '6px', background: 'rgba(217, 192, 143,0.12)' }} />
          <div className="animate-pulse" style={{ height: '44px', borderRadius: '12px', background: 'rgba(217, 192, 143,0.10)' }} />
          <div className="animate-pulse" style={{ height: '44px', borderRadius: '12px', background: 'rgba(217, 192, 143,0.10)' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(max(env(safe-area-inset-top, 0px) + 20px, 60px)) 16px 60px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 className="section-title" style={{ fontSize: '1.8rem' }}>
            Nueva <span className="text-gold">Contraseña</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>
            Ingresa tu nueva contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '24px' }}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Nueva Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Confirmar Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-gold" disabled={loading} style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 15, borderRadius: 'var(--radius-pill)', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
