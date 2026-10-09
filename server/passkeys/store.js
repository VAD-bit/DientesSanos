import { getAdminClient } from './supabaseAdmin.js';

const table = (name) => getAdminClient().from(name);

export const listCredentials = async (authUserId, includeSecret = false) => {
  const columns = includeSecret
    ? '*'
    : 'id, name, credential_id, device_type, backed_up, transports, created_at, last_used_at, revoked_at';
  const { data, error } = await table('passkey_credentials')
    .select(columns)
    .eq('auth_user_id', authUserId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const findCredential = async (credentialId) => {
  const { data, error } = await table('passkey_credentials')
    .select('*')
    .eq('credential_id', credentialId)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const saveChallenge = async ({ challenge, purpose, authUserId = null, requestFingerprint = null }) => {
  const { data, error } = await table('passkey_challenges')
    .insert({
      challenge,
      purpose,
      auth_user_id: authUserId,
      request_fingerprint: requestFingerprint,
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

export const consumeChallenge = async ({ id, purpose, authUserId }) => {
  let query = table('passkey_challenges')
    .delete()
    .eq('id', id)
    .eq('purpose', purpose)
    .gt('expires_at', new Date().toISOString());
  query = authUserId ? query.eq('auth_user_id', authUserId) : query.is('auth_user_id', null);
  const { data, error } = await query.select('challenge');
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw Object.assign(new Error('El reto venció o ya fue utilizado'), { statusCode: 400 });
  return row.challenge;
};

export const saveCredential = async (record) => {
  const { error } = await table('passkey_credentials').insert(record);
  if (error) {
    if (error.code === '23505') throw Object.assign(new Error('Esta passkey ya está registrada'), { statusCode: 409 });
    throw error;
  }
};

export const updateCredentialUsage = async (id, previousCounter, counter) => {
  const { data, error } = await table('passkey_credentials')
    .update({ counter, last_used_at: new Date().toISOString() })
    .eq('id', id)
    .eq('counter', previousCounter)
    .is('revoked_at', null)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw Object.assign(new Error('La passkey ya fue utilizada en otra solicitud'), { statusCode: 409 });
};

export const revokeCredential = async (id, authUserId) => {
  const { data, error } = await table('passkey_credentials')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('auth_user_id', authUserId)
    .is('revoked_at', null)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw Object.assign(new Error('Dispositivo no encontrado'), { statusCode: 404 });
};
