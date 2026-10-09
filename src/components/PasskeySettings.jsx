import React, { useCallback, useEffect, useState } from 'react';
import { Fingerprint, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { passkeyService } from '../services/passkeyService';
import { SkeletonList } from './Skeleton';

const formatDate = value => value ? new Date(value).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca';

export default function PasskeySettings({ showToast }) {
  const available = passkeyService.isAvailable();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(available);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCredentials(await passkeyService.list());
    } catch (error) {
      showToast?.(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!available) return undefined;
    let active = true;
    passkeyService.list()
      .then((items) => {
        if (active) setCredentials(items);
      })
      .catch((error) => {
        if (active) showToast?.(error.message, 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [available, showToast]);

  if (!available) return null;

  const register = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const suggestedName = /iphone|ipad/i.test(navigator.userAgent) ? 'iPhone / iPad' : /android/i.test(navigator.userAgent) ? 'Android' : 'Este dispositivo';
      await passkeyService.register(suggestedName);
      showToast?.('Acceso biométrico activado', 'success');
      await load();
    } catch (error) {
      if (error?.name !== 'NotAllowedError') showToast?.(error.message || 'No se pudo registrar el dispositivo', 'error');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async id => {
    if (busy) return;
    setBusy(true);
    try {
      await passkeyService.revoke(id);
      setCredentials(current => current.filter(item => item.id !== id));
      showToast?.('Dispositivo revocado', 'success');
    } catch (error) {
      showToast?.(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card" style={{ padding: '24px', borderRadius: '24px', marginTop: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: 900, fontSize: '18px' }}>
            <ShieldCheck size={21} color="#d4bd94" /> Seguridad y biometría
            <span style={{
              padding: '4px 8px', borderRadius: '999px', fontSize: '9px',
              letterSpacing: '.08em', color: '#d4bd94',
              border: '1px solid rgba(212,189,148,.28)', background: 'rgba(212,189,148,.08)',
            }}>
              OPCIONAL
            </span>
          </div>
          <p style={{ margin: '7px 0 0', color: 'rgba(255,255,255,.55)', fontSize: '13px' }}>
            Si quieres, activa Face ID, huella, Windows Hello o el PIN seguro de tu equipo. Puedes seguir usando tu cuenta normalmente sin configurarlo.
          </p>
        </div>
        <button className="primary-button" onClick={register} disabled={busy} style={{ minHeight: '46px' }}>
          {busy ? <Loader2 size={18} className="spin" /> : <Fingerprint size={19} />}
          Activar en este dispositivo
        </button>
      </div>
      <div style={{ marginTop: '18px', display: 'grid', gap: '10px' }}>
        {loading && <SkeletonList rows={2} rowHeight={52} />}
        {!loading && !credentials.length && <div style={{ color: 'rgba(255,255,255,.45)', padding: '14px 0' }}>Aún no tienes dispositivos registrados.</div>}
        {credentials.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px', border: '1px solid rgba(255,255,255,.08)', borderRadius: '15px', background: 'rgba(255,255,255,.025)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <KeyRound size={19} color="#d4bd94" />
              <div style={{ minWidth: 0 }}>
                <strong style={{ color: '#fff' }}>{item.name}</strong>
                <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '11px', marginTop: '3px' }}>Último uso: {formatDate(item.last_used_at)}</div>
              </div>
            </div>
            <button type="button" onClick={() => revoke(item.id)} disabled={busy} aria-label="Revocar dispositivo" style={{ border: '1px solid rgba(255,69,58,.25)', background: 'rgba(255,69,58,.08)', color: '#ff453a', borderRadius: '10px', padding: '9px', display: 'grid', placeItems: 'center' }}>
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <p style={{ color: 'rgba(255,255,255,.35)', fontSize: '11px', margin: '16px 0 0' }}>
        Dientes Sanos no guarda tu rostro ni tu huella; el dispositivo conserva la passkey y el servidor solo almacena su clave pública.
      </p>
    </section>
  );
}
