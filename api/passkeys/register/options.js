import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getPasskeyConfig, assertAllowedOrigin } from '../../../server/passkeys/config.js';
import { handleError, json, requireMethod } from '../../../server/passkeys/http.js';
import { getAuthenticatedUser, getActiveStaff } from '../../../server/passkeys/supabaseAdmin.js';
import { listCredentials, saveChallenge } from '../../../server/passkeys/store.js';
import { assertPasskeyRateLimit } from '../../../server/passkeys/rateLimit.js';

export default async function handler(request, response) {
  if (!requireMethod(request, response, ['POST'])) return;
  try {
    const config = getPasskeyConfig(request);
    assertAllowedOrigin(request, config.origin);
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
  } catch (error) {
    return handleError(response, error);
  }
}
