import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { supabase } from '../lib/supabase';

const enabled = String(import.meta.env.VITE_PASSKEYS_ENABLED || '').toLowerCase() === 'true';

const request = async (path, { method = 'GET', body, authenticated = false } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Inicia sesión para administrar tus dispositivos');
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const response = await fetch(`/api/passkeys/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la operación');
  return payload;
};

export const passkeyService = {
  isAvailable() {
    return enabled && browserSupportsWebAuthn();
  },

  async login() {
    const start = await request('authenticate/options', { method: 'POST' });
    const credential = await startAuthentication({ optionsJSON: start.options });
    const result = await request('authenticate/verify', {
      method: 'POST',
      body: { challengeId: start.challengeId, response: credential },
    });
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: result.tokenHash,
      type: 'magiclink',
    });
    if (error || !data?.session) throw new Error(error?.message || 'No se pudo iniciar la sesión');
    return data;
  },

  async register(name) {
    const start = await request('register/options', { method: 'POST', authenticated: true });
    const credential = await startRegistration({ optionsJSON: start.options });
    return request('register/verify', {
      method: 'POST',
      authenticated: true,
      body: { challengeId: start.challengeId, response: credential, name },
    });
  },

  async list() {
    const result = await request('credentials', { authenticated: true });
    return result.credentials || [];
  },

  async revoke(credentialId) {
    return request('credentials/revoke', {
      method: 'POST',
      authenticated: true,
      body: { credentialId },
    });
  },
};
