import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getPasskeyConfig, assertAllowedOrigin } from '../../../server/passkeys/config.js';
import { handleError, json, parseBody, requireMethod } from '../../../server/passkeys/http.js';
import { getAuthenticatedUser, getActiveStaff } from '../../../server/passkeys/supabaseAdmin.js';
import { consumeChallenge, saveCredential } from '../../../server/passkeys/store.js';
import { bytesToBase64Url } from '../../../server/passkeys/encoding.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    const config = getPasskeyConfig(request);
    assertAllowedOrigin(request, config.origin);
    const authUser = await getAuthenticatedUser(request);
    const staff = await getActiveStaff(authUser.id);
    const body = parseBody(request);
    if (!body.challengeId || !body.response) throw Object.assign(new Error('Respuesta de registro incompleta'), { statusCode: 400 });
    const expectedChallenge = await consumeChallenge({ id: body.challengeId, purpose: 'registration', authUserId: authUser.id });
    const verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) throw Object.assign(new Error('No se pudo verificar la passkey'), { statusCode: 400 });
    const info = verification.registrationInfo;
    await saveCredential({
      auth_user_id: authUser.id,
      staff_id: staff.id,
      audience: 'crm',
      name: String(body.name || 'Este dispositivo').trim().slice(0, 80),
      credential_id: info.credential.id,
      public_key: bytesToBase64Url(info.credential.publicKey),
      counter: info.credential.counter,
      transports: body.response.response?.transports || [],
      device_type: info.credentialDeviceType,
      backed_up: info.credentialBackedUp,
      aaguid: info.aaguid || null,
    });
    return json(response, 200, { verified: true });
  } catch (error) {
    return handleError(response, error);
  }
}
