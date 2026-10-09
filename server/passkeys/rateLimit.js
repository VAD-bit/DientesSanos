import { createHmac } from 'node:crypto';
import { getAdminClient } from './supabaseAdmin.js';

const getIp = request => String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();

export const requestFingerprint = request => {
  const secret = process.env.PASSKEY_RATE_LIMIT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('Falta PASSKEY_RATE_LIMIT_SECRET');
  return createHmac('sha256', secret || 'panda-local-passkey-rate-limit')
    .update(getIp(request))
    .digest('hex');
};

export const assertPasskeyRateLimit = async (request, purpose, limit = 10) => {
  const fingerprint = requestFingerprint(request);
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count, error } = await getAdminClient()
    
    .from('passkey_challenges')
    .select('id', { count: 'exact', head: true })
    .eq('purpose', purpose)
    .eq('request_fingerprint', fingerprint)
    .gte('created_at', since);
  if (error) throw error;
  if (Number(count || 0) >= limit) {
    throw Object.assign(new Error('Demasiados intentos. Espera unos minutos.'), { statusCode: 429 });
  }
  return fingerprint;
};
