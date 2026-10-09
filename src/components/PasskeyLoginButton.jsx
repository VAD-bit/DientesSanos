import React, { useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import { passkeyService } from '../services/passkeyService';

const friendlyError = (error) => {
  if (error?.name === 'NotAllowedError') return 'Se canceló la verificación o no hay una passkey registrada.';
  return error?.message || 'No se pudo usar la biometría.';
};

export default function PasskeyLoginButton({ onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  if (!passkeyService.isAvailable()) return null;

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    onError?.('');
    try {
      await passkeyService.login();
      await onSuccess?.();
    } catch (error) {
      onError?.(friendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="panda-passkey-btn" onClick={handleLogin} disabled={loading}>
      {loading ? <Loader2 size={18} className="l-spin" /> : <Fingerprint size={20} />}
      <span>{loading ? 'VERIFICANDO...' : 'ENTRAR CON HUELLA O FACE ID'}</span>
    </button>
  );
}
