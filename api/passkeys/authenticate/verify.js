import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getPasskeyConfig, assertAllowedOrigin } from '../../../server/passkeys/config.js';
import { handleError, json, parseBody, requireMethod } from '../../../server/passkeys/http.js';
import { getActiveStaff, issueSupabaseLoginToken } from '../../../server/passkeys/supabaseAdmin.js';
import { consumeChallenge, findCredential, updateCredentialUsage } from '../../../server/passkeys/store.js';
import { base64UrlToBytes } from '../../../server/passkeys/encoding.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    const config = getPasskeyConfig(request);
    assertAllowedOrigin(request, config.origin);
    const body = parseBody(request);
    if (!body.challengeId || !body.response?.id) throw Object.assign(new Error('Respuesta biométrica incompleta'), { statusCode: 400 });
    const expectedChallenge = await consumeChallenge({ id: body.challengeId, purpose: 'authentication', authUserId: null });
    const stored = await findCredential(body.response.id);
    if (!stored || stored.audience !== 'crm') throw Object.assign(new Error('Passkey no registrada o revocada'), { statusCode: 401 });
    await getActiveStaff(stored.auth_user_id);
    const verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      credential: {
        id: stored.credential_id,
        publicKey: base64UrlToBytes(stored.public_key),
        counter: Number(stored.counter || 0),
        transports: stored.transports || [],
      },
      requireUserVerification: true,
    });
    if (!verification.verified) throw Object.assign(new Error('Verificación biométrica rechazada'), { statusCode: 401 });
    await updateCredentialUsage(stored.id, stored.counter, verification.authenticationInfo.newCounter);
    const tokenHash = await issueSupabaseLoginToken(stored.auth_user_id);
    return json(response, 200, { verified: true, tokenHash });
  } catch (error) {
    return handleError(response, error);
  }
}
