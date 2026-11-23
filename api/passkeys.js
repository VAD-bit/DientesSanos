import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { getPasskeyConfig, assertAllowedOrigin } from '../server/passkeys/config.js';
import { handleError, json, parseBody, requireMethod } from '../server/passkeys/http.js';
import { getAuthenticatedUser, getActiveStaff, issueSupabaseLoginToken } from '../server/passkeys/supabaseAdmin.js';
import { listCredentials, saveChallenge, consumeChallenge, saveCredential, findCredential, updateCredentialUsage, revokeCredential } from '../server/passkeys/store.js';
import { bytesToBase64Url, base64UrlToBytes } from '../server/passkeys/encoding.js';
import { assertPasskeyRateLimit } from '../server/passkeys/rateLimit.js';

// Router único para todos los endpoints de Passkeys/WebAuthn.
// Reduce 6 Serverless Functions a 1 (límite del plan Hobby de Vercel: 12).
export default async function handler(request, response) {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathParam = url.searchParams.get('path') || '';
    const path = pathParam ? `/api/passkeys/${pathParam}` : '/api/passkeys';
    const method = request.method;

    const config = getPasskeyConfig(request);
    assertAllowedOrigin(request, config.origin);

    // ---------------- POST /api/passkeys/register/options ----------------
    if (path === '/api/passkeys/register/options' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
      const authUser = await getAuthenticatedUser(request);
      const staff = await getActiveStaff(authUser.id);
      const credentials = await listCredentials(authUser.id);
      const fingerprint = await assertPasskeyRateLimit(request, 'registration');
      const options = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpID,
        userID: new TextEncoder().encode(authUser.id),
        userName: authUser.email || staff.email || staff.name,
        userDisplayName: staff.name,
        attestationType: 'none',
        excludeCredentials: credentials.map(item => ({ id: item.credential_id, transports: item.transports || [] })),
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        preferredAuthenticatorType: 'localDevice',
      });
      const challengeId = await saveChallenge({ challenge: options.challenge, purpose: 'registration', authUserId: authUser.id, requestFingerprint: fingerprint });
      return json(response, 200, { options, challengeId });
    }

    // ---------------- POST /api/passkeys/register/verify ----------------
    if (path === '/api/passkeys/register/verify' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
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
    }

    // ---------------- POST /api/passkeys/authenticate/options ----------------
    if (path === '/api/passkeys/authenticate/options' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
      const fingerprint = await assertPasskeyRateLimit(request, 'authentication');
      const options = await generateAuthenticationOptions({
        rpID: config.rpID,
        userVerification: 'required',
        allowCredentials: [],
      });
      const challengeId = await saveChallenge({ challenge: options.challenge, purpose: 'authentication', requestFingerprint: fingerprint });
      return json(response, 200, { options, challengeId });
    }

    // ---------------- POST /api/passkeys/authenticate/verify ----------------
    if (path === '/api/passkeys/authenticate/verify' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
      const body = parseBody(request);
      if (!body.challengeId || !body.response?.id) throw Object.assign(new Error('Respuesta biomϿ½trica incompleta'), { statusCode: 400 });
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
      if (!verification.verified) throw Object.assign(new Error('VerificaciϿ½n biomϿ½trica rechazada'), { statusCode: 401 });
      await updateCredentialUsage(stored.id, stored.counter, verification.authenticationInfo.newCounter);
      const tokenHash = await issueSupabaseLoginToken(stored.auth_user_id);
      return json(response, 200, { verified: true, tokenHash });
    }

    // ---------------- GET /api/passkeys/credentials ----------------
    if (path === '/api/passkeys/credentials' && method === 'GET') {
      if (!requireMethod(request, response, ['GET'])) return;
      const authUser = await getAuthenticatedUser(request);
      await getActiveStaff(authUser.id);
      const credentials = await listCredentials(authUser.id);
      return json(response, 200, {
        credentials: credentials.map((credential) => ({
          id: credential.id,
          name: credential.name,
          device_type: credential.device_type,
          backed_up: credential.backed_up,
          transports: credential.transports,
          created_at: credential.created_at,
          last_used_at: credential.last_used_at,
          revoked_at: credential.revoked_at,
        })),
      });
    }

    // ---------------- POST /api/passkeys/credentials/revoke ----------------
    if (path === '/api/passkeys/credentials/revoke' && method === 'POST') {
      if (!requireMethod(request, response, ['POST'])) return;
      const authUser = await getAuthenticatedUser(request);
      await getActiveStaff(authUser.id);
      const body = parseBody(request);
      if (!body.credentialId) throw Object.assign(new Error('Selecciona un dispositivo'), { statusCode: 400 });
      await revokeCredential(body.credentialId, authUser.id);
      return json(response, 200, { revoked: true });
    }

    return json(response, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    return handleError(response, error);
  }
}

